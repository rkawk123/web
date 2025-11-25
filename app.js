//PC index.html

const API = "https://backend-6i2t.onrender.com/predict";
const API_STREAM = "https://backend-6i2t.onrender.com/predict_stream";

const $dropArea = document.getElementById("drop-area");
const $file = document.getElementById("file");
const $preview = document.getElementById("preview");
const $btn = document.getElementById("btn");
const $result = document.getElementById("result");
const $loader = document.getElementById("loading");
const $scanLine = document.querySelector(".scan-line");
const $resultText = document.getElementById("resultText");
const $cameraBtn = document.getElementById("camera-btn");
const $previewWrapper = document.querySelector(".preview-wrapper");
const $captureBtn = document.createElement("div");
const $video = document.createElement("video");
const $canvas = document.createElement("canvas");
const $shopLinks = document.getElementById("shopLinks"); // 🛍 링크 요소 가져오기
const $status = document.getElementById("status");

// 드래그 & 드롭
["dragenter", "dragover"].forEach(eventName => {
  $dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
    $dropArea.classList.add("highlight");
  });
});

["dragleave", "drop"].forEach(eventName => {
  $dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
    $dropArea.classList.remove("highlight");
  });
});

$dropArea.addEventListener("drop", e => {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    $file.files = files;
    document.getElementById("shopTitle").style.display = "none";
    showPreview(files[0]);
  }
});

$file.addEventListener("change", () => {
  if ($file.files.length > 0) {
    document.getElementById("shopTitle").style.display = "none";
    showPreview($file.files[0]);
  }
});

//이미지 미리보기
function showPreview(fileOrBlob) {
  const reader = new FileReader();
  reader.onload = e => {
    $preview.onload = () => {
      $scanLine.style.width = $preview.clientWidth + "px";
      $scanLine.style.left = $preview.offsetLeft + "px";
    };
    $preview.src = e.target.result;
    $result.textContent = "";
    $resultText.innerHTML = "";
    $shopLinks.style.display = "none";
    document.getElementById("shopTitle").style.display = "none";
  };
  reader.readAsDataURL(fileOrBlob);
}

// 버튼 클릭 + 슬라이드
$btn.addEventListener("click", async () => {
  let uploadFile = $file.files?.[0] || $file._cameraBlob;
  if (!uploadFile) {
    alert("이미지를 선택하거나 촬영하세요!");
    return;
  }

  const fd = new FormData();
  fd.append("file", uploadFile);

  $loader.style.display = "inline-block";
  $scanLine.style.display = "block";
  $result.textContent = "";
  $resultText.innerHTML = "";
  $shopLinks.style.display = "none";
  document.getElementById("shopTitle").style.display = "none";

  // 슬라이드 interval id 저장
  if (!window.__fabric_slide_interval_id) window.__fabric_slide_interval_id = null;

  try {
    const res = await fetch(API_STREAM, { method: "POST", body: fd });

    if (!res.ok) {
      // 에러 응답이면 전체 텍스트 읽고 예외 발생
      const errText = await res.text();
      throw new Error(errText || "요청 실패");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let chunk = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunk += decoder.decode(value, { stream: true });
      let lines = chunk.split("\n");
      chunk = lines.pop(); // 불완전한 마지막 줄은 다음 루프에서 처리

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let parsed;
        try {
          parsed = JSON.parse(trimmed);
        } catch (e) {
          console.warn("JSON 파싱 실패한 라인:", trimmed, e);
          continue;
        }

        // 진행 상태 표시
        if (parsed.status) {
          $status.innerText = parsed.status;
        }

        // 최종 결과 표시
        if (parsed.result) {
          const r = parsed.result;

          // 예측 결과 표시
          if (r.predictions?.length) {
            let text = "Top Predictions:\n";
            r.predictions.forEach((p, i) => {
              text += `${i + 1}. Label: ${p.label} (Score: ${(p.score * 100).toFixed(2)}%)\n`;
            });
            $result.textContent = text;
          } else if (parsed.error) {
            $result.textContent = "백엔드 에러: " + parsed.error;
          } else {
            $result.textContent = "예측 결과를 받지 못했습니다.";
          }

          // 상세 정보 + 슬라이드
          if (r.ko_name) {
            $resultText.innerHTML = `
              <h3>${r.ko_name} (${r.predicted_fabric || ""})</h3>
              <p>🧺 세탁법: ${r.wash_method || "정보 없음"}</p>
              <p>🌬️ 건조법: ${r.dry_method || "정보 없음"}</p>
              <p>⚠️ 주의사항: ${r.special_note || "정보 없음"}</p>
            `;

            const fabric = (r.predicted_fabric || "").toLowerCase();
            const query = encodeURIComponent(r.ko_name);

            // 브랜드별 이미지 배열
            const shopImages = {
              naver: [`./images/naver/${fabric}1.jpg`, `./images/naver/${fabric}2.jpg`],
              musinsa: [`./images/musinsa/${fabric}3.jpg`, `./images/musinsa/${fabric}4.jpg`],
              spao: [`./images/spao/${fabric}5.jpg`, `./images/spao/${fabric}6.jpg`]
            };

            const shopLinksData = [
              { name: "네이버 쇼핑", url: `https://search.shopping.naver.com/search/all?query=${query}`, images: shopImages.naver },
              { name: "무신사", url: `https://www.musinsa.com/search/musinsa/integration?keyword=${query}`, images: shopImages.musinsa },
              { name: "스파오", url: `https://www.spao.com/product/search.html?keyword=${query}`, images: shopImages.spao }
            ];

            // 초기 이미지 생성
            $shopLinks.innerHTML = shopLinksData
              .map((shop) => `
                <a href="${shop.url}" target="_blank" class="shop-link">
                  ${shop.images.map((img, i) => `<img src="${img}" alt="${shop.name} 이미지 ${i+1}" class="${i === 0 ? 'active' : ''}">`).join('')}
                </a>
              `).join("");

            $shopLinks.style.display = "flex";
            document.getElementById("shopTitle").style.display = "block";

            // 슬라이드: 이전 interval 있으면 제거
            if (window.__fabric_slide_interval_id) {
              clearInterval(window.__fabric_slide_interval_id);
              window.__fabric_slide_interval_id = null;
            }

            let currentSlide = 0;
            const maxLen = Math.max(...shopLinksData.map(s => s.images.length));

            window.__fabric_slide_interval_id = setInterval(() => {
              $shopLinks.querySelectorAll("a").forEach((aTag) => {
                const imgs = aTag.querySelectorAll("img");
                imgs.forEach((img, i) => {
                  img.classList.toggle("active", i === (currentSlide % imgs.length));
                });
              });
              currentSlide++;
            }, 2000);
          }
        }

        // 서버에서 에러 형태로 보낼 경우
        if (parsed.error) {
          $result.textContent = "백엔드 에러: " + parsed.error;
        }
      }
    }

    // 남은 chunk 처리
    const trailing = chunk.trim();
    if (trailing) {
      try {
        const parsed = JSON.parse(trailing);
        if (parsed.status) $status.innerText = parsed.status;
        if (parsed.result) {
        }
      } catch (e) {
        // 무시하거나 로그
        console.warn("마지막 남은 청크 JSON 파싱 실패:", trailing);
      }
    }
  } catch (e) {
    $result.textContent = "에러: " + (e.message || e);
    $resultText.innerText = "에러: " + (e.message || e);
  } finally {
    $loader.style.display = "none";
    $scanLine.style.display = "none";
  }
});

// 카메라 촬영
$cameraBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
     video: { facingMode: { ideal: "environment" } },
     audio: false
    });

    $video.srcObject = stream;
    $video.autoplay = true;
    $video.playsInline = true;
    $video.width = 300; $video.height = 200;

    $previewWrapper.innerHTML = "";
    $previewWrapper.appendChild($video);

    await new Promise(resolve =>
      $video.onloadedmetadata = () => { $video.play(); resolve();
    });

    $captureBtn.className = "capture-circle";
    $previewWrapper.appendChild($captureBtn);

    $captureBtn.addEventListener("click", async () => {
      $canvas.width = $video.videoWidth;
      $canvas.height = $video.videoHeight;
      $canvas.getContext("2d").drawImage($video, 0, 0);

      const blob = await new Promise(resolve => $canvas.toBlob(resolve, "image/png"));
      stream.getTracks().forEach(track => track.stop());

      showPreview(blob); // 추가, 이미지 미리보기 + 스캔 라인 위치
      $previewWrapper.innerHTML = "";
      $previewWrapper.appendChild($preview);
      $previewWrapper.appendChild($scanLine);

      $file._cameraBlob = blob; // 업로드용
      $btn.click();             // 바로 서버에 POST
    });
  } catch (err) {
    alert("카메라를 사용할 수 없습니다: "+err.message);
  }
});

// 서버 ping
setInterval(async () => {
  try {
    const res = await fetch("https://backend-6i2t.onrender.com/ping");
    if (res.ok) console.log("서버 ping 성공");
  } catch (err) {
    console.warn("서버 ping 실패:", err);
  }
}, 5 * 60 * 1000);


