const API = "https://backend-6i2t.onrender.com/predict";
const STREAM_API = "https://backend-6i2t.onrender.com/predict_stream"; //

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
const $status = document.getElementById("status"); //

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

//클릭 버튼
$btn.addEventListener("click", async () => {
  let uploadFile = $file.files[0] || $file._cameraBlob;
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

  try {
    const res = await fetch(API_STREAM, { method: "POST", body: fd });
    if (!res.ok) throw new Error("서버 요청 실패");

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
        if (!line.trim()) continue;

        const data = JSON.parse(line);

        // 진행 상태 표시
        if (data.status) {
          $status.innerText = data.status;  // 새 상태가 들어올 때마다 덮어씀
        }

        // 최종 결과 표시
        if (data.result) {
          const r = data.result;

          if (r.predictions?.length) {
            const textArr = r.predictions.map((p, i) => {
                return `${i + 1}. Label: ${p.label} (Score: ${(p.score * 100).toFixed(2)}%)`;
            });

            $result.textContent = "Top Predictions:\n" + textArr.join("\n");
          }

          if (r.ko_name) {
            $resultText.innerHTML = `
              <h3>${r.ko_name} (${r.predicted_fabric})</h3>
              <p>🧺 세탁법: ${r.wash_method}</p>
              <p>🌬️ 건조법: ${r.dry_method}</p>
              <p>⚠️ 주의사항: ${r.special_note}</p>
            `;

            const fabricName = r.ko_name || r.predicted_fabric;
            const query = encodeURIComponent(fabricName);

            const shopLinksArr = [
              { name:"네이버 쇼핑", url:`https://search.shopping.naver.com/search/all?query=${query}`, img:"./images/1.jpg" },
              { name:"무신사", url:`https://www.musinsa.com/search/musinsa/integration?keyword=${query}`, img:"./images/2.jpg" },
              { name:"스파오", url:`https://www.spao.com/product/search.html?keyword=${query}`, img:"./images/3.jpg" }
            ];

            $shopLinks.innerHTML = shopLinksArr.map(link=>`
              <a href="${link.url}" target="_blank" class="shop-link">
                <img src="${link.img}" alt="${link.name} 로고">
              </a>
            `).join("");

            $shopLinks.style.display = "flex";
            document.getElementById("shopTitle").style.display = "block";
          }
        }
      }
    }
  } catch (e) {
    $result.textContent = "에러: " + e.message;
    $resultText.innerText = "에러: " + e.message;
  } finally {
    $loader.style.display = "none";
    $scanLine.style.display = "none";
  }
});

// 카메라 촬영
$cameraBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
    $video.srcObject = stream;
    $video.autoplay = true;
    $video.playsInline = true;
    $video.width = 300; $video.height = 200;

    $previewWrapper.innerHTML = ""; $previewWrapper.appendChild($video);

    await new Promise(resolve => $video.onloadedmetadata = () => { $video.play(); resolve(); });

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



