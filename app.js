
const API = "https://backend-6i2t.onrender.com/predict";

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
const $shopLinks = document.getElementById("shopLinks"); // 링크 요소 가져오기

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
    document.getElementById("shopTitle").style.display = "none"; // 제목 숨기기
    showPreview(files[0]);
  }
});

$file.addEventListener("change", () => {
  if ($file.files.length > 0) {
    document.getElementById("shopTitle").style.display = "none"; // 제목 숨기기
    showPreview($file.files[0]);
  }
});

function showPreview(fileOrBlob) {
  const reader = new FileReader();
  reader.onload = e => {
    $preview.onload = () => {
      $scanLine.style.width = $preview.clientWidth + "px";
      $scanLine.style.left = $preview.offsetLeft + "px"; // 이미지 왼쪽 기준 맞춤
    };
    $preview.src = e.target.result;
    $result.textContent = "";
    $resultText.innerHTML = "";
    $shopLinks.style.display = "none"; // 새로운 이미지 올릴 때 링크 숨기기
    document.getElementById("shopTitle").style.display = "none"; // 제목 숨기기
  };
  reader.readAsDataURL(fileOrBlob);
}

function showOverlay() {
  document.getElementById('accessibilityOverlay').style.display = 'flex';
}
function closeOverlay() {
  document.getElementById('accessibilityOverlay').style.display = 'none';
}


// 서버 업로드 및 예측
$btn.addEventListener("click", async () => {
  let uploadFile = $file.files[0] || $file._cameraBlob;
  if (!uploadFile) {
    alert("이미지를 선택하거나 촬영하세요!");
    return;
  }

  document.querySelector(".result-box")?.classList.remove("active");

  const fd = new FormData();
  fd.append("file", uploadFile);

  $loader.style.display = "inline-block";
  $scanLine.style.display = "block";
  $result.textContent = "";
  $resultText.innerHTML = "";
  $shopLinks.style.display = "none"; // 로딩 중엔 링크 숨김
  document.getElementById("shopTitle").style.display = "none"; // 제목 숨기기

  try {
    const res = await fetch(API, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "요청 실패");

    if (data.predictions?.length) {
      let progressBarsHtml = "";
    
      data.predictions.forEach((p) => {
        const percent = (p.score * 100).toFixed(1);
    
        progressBarsHtml += `
          <div class="progress-row">
            <span class="progress-label">${p.label}</span>
            
            <div class="progress-wrapper">
              <div class="progress-bar" data-percent="${percent}" style="width:0"></div>
            </div>
    
            <span class="progress-percent">${percent}%</span>
          </div>
        `;
      });
    
      // 막대바 영역에 출력
      document.getElementById("progressBarsContainer").innerHTML = progressBarsHtml;
    
      // fade-in + 애니메이션
      const container = document.getElementById("progressBarsContainer");
      container.style.opacity = 0;
      container.style.transform = "translateY(20px)";
      container.style.transition = "opacity 0.5s, transform 0.5s";
    
      setTimeout(() => {
        container.style.opacity = 1;
        container.style.transform = "translateY(0)";
    
        document.querySelectorAll(".progress-bar").forEach((bar) => {
          const percent = bar.dataset.percent;
          bar.style.transition = "width 1.2s cubic-bezier(.42,0,.58,1)";
          bar.style.width = percent + "%";
        });
      }, 100);
  

    } else if (data.error) {
      $result.textContent = "백엔드 에러: " + data.error;
    } else {
      $result.textContent = "예측 결과를 받지 못했습니다.";
    }

    if (data.ko_name) {
      $resultText.innerHTML = `
        <h3>${data.ko_name} (${data.predicted_fabric})</h3>
        <p>🧺 세탁법: ${data.wash_method}</p>
        <p>🌬️ 건조법: ${data.dry_method}</p>
        <p>⚠️ 주의사항: ${data.special_note}</p>
      `;

       // 🔥 예측 성공 → 결과 박스 등장
      document.querySelector(".result-box")?.classList.add("active");

      // 🔗 예측된 재질명으로 쇼핑몰 링크 생성
      const fabricName = data.ko_name || data.predicted_fabric;
      const query = encodeURIComponent(fabricName);

      const shopLinks = [
        {
          name: "네이버 쇼핑",
          url: `https://search.shopping.naver.com/search/all?query=${query}`,
          img: "./images/1.jpg"
        },
        {
          name: "무신사",
          url: `https://www.musinsa.com/search/musinsa/integration?keyword=${query}`,
          img: "./images/2.jpg"
        },
        {
          name: "스파오",
          url: `https://www.spao.com/product/search.html?keyword=${query}`,
          img: "./images/3.jpg"
        }
      ];

      $shopLinks.innerHTML = shopLinks
        .map(link => `
          <a href="${link.url}" target="_blank" class="shop-link">
            <img src="${link.img}" alt="${link.name} 로고">
          </a>
        `)
        .join("");

      $shopLinks.style.display = "flex";
      document.getElementById("shopTitle").style.display = "block"; // AI 추천 표시
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
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });

    $video.srcObject = stream;
    $video.autoplay = true;
    $video.playsInline = true;
    $video.width = 300;
    $video.height = 200;

    $previewWrapper.innerHTML = "";
    $previewWrapper.appendChild($video);

    // 비디오 메타데이터 로드 완료 대기
    await new Promise(resolve => {
      $video.onloadedmetadata = () => {
        $video.play();
        resolve();
      };
    });

    $captureBtn.className = "capture-circle";
    $previewWrapper.appendChild($captureBtn);

    $captureBtn.addEventListener("click", async () => {
      // video 크기 로드 후 캡처
      $canvas.width = $video.videoWidth;
      $canvas.height = $video.videoHeight;
      $canvas.getContext("2d").drawImage($video, 0, 0);

      const blob = await new Promise(resolve => $canvas.toBlob(resolve, "image/png"));

      // 스트림 종료
      stream.getTracks().forEach(track => track.stop());

      // 미리보기 표시
      $preview.src = URL.createObjectURL(blob);
      $previewWrapper.innerHTML = "";
      $previewWrapper.appendChild($preview);

      // 스캔라인 복원
      $scanLine.className = "scan-line";
      $scanLine.id = "scan-line";
      $previewWrapper.appendChild($scanLine);

      // 바로 예측 실행
      $file._cameraBlob = blob;
      $loader.style.display = "inline-block";
      $scanLine.style.display = "block";
      $btn.click();
    });
  } catch (err) {
    alert("카메라를 사용할 수 없습니다: " + err.message);
  }
});

// 5분마다 서버에 ping 보내기
setInterval(async () => {
  try {
    const res = await fetch("https://backend-6i2t.onrender.com/ping");
    if (res.ok) {
      console.log("서버 ping 성공");
    }
  } catch (err) {
    console.warn("서버 ping 실패:", err);
  }
}, 5 * 60 * 1000); // 5분 = 300,000 ms


// 문의 폼 제출 기능만 별도
document.getElementById("contactForm").addEventListener("submit", function (e) {
  e.preventDefault(); // 새로고침 방지

  const name = document.getElementById("name").value.trim();
  const contact = document.getElementById("contactInfo").value.trim();
  const message = document.getElementById("message").value.trim();

  if (!name || !message) {
    alert("이름과 메모는 필수입니다!");
    return;
  }

  // 방명록 항목 생성
  const li = document.createElement("li");
  li.innerHTML = `
      <strong>${name}</strong>
      <div class="date">${new Date().toLocaleString()}</div>
      <p>${message}</p>
      ${contact ? `<small>연락처: ${contact}</small>` : ""}
  `;

  // 피드에 추가
  document.getElementById("guestbookFeed").prepend(li);

  // 폼 초기화
  document.getElementById("contactForm").reset();
});
