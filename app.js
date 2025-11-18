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
const $shopLinks = document.getElementById("shopLinks");

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

// 미리보기
function showPreview(fileOrBlob) {
  if (!fileOrBlob) return;
  const reader = new FileReader();
  reader.onload = e => {
    const dataURL = e.target.result;
    if (!dataURL) return;

    $preview.src = dataURL;
    $preview.style.display = "block";
    $preview.onload = () => {
      $scanLine.style.width = $preview.clientWidth + "px";
      $scanLine.style.left = $preview.offsetLeft + "px";
    };

    $result.textContent = "";
    $resultText.innerHTML = "";
    $shopLinks.style.display = "none";
    document.getElementById("shopTitle").style.display = "none";
  };
  reader.readAsDataURL(fileOrBlob);
}

// 서버 업로드 및 예측
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
    const res = await fetch(API, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "요청 실패");

    if (data.predictions?.length) {
      let text = "Top Predictions:\n";
      data.predictions.forEach((p, i) => {
        text += `${i + 1}. Label: ${p.label} (Score: ${(p.score * 100).toFixed(2)}%)\n`;
      });
      $result.textContent = text;
    } else if (data.error) {
      $result.textContent = "백엔드 에러: " + data.error;
    } else {
      $result.textContent = "예측 결과를 받지 못했습니다.";
    }

    // 🔹 AI 추천 이미지 슬라이드 (PNG/JPG 자동 체크)
    if (data.ko_name) {
      $resultText.innerHTML = `
        <h3>${data.ko_name} (${data.predicted_fabric})</h3>
        <p>🧺 세탁법: ${data.wash_method}</p>
        <p>🌬️ 건조법: ${data.dry_method}</p>
        <p>⚠️ 주의사항: ${data.special_note}</p>
      `;

      const classFolder = data.predicted_fabric.toLowerCase();
      const maxImages = 6;
      const images = [];

      // 이미지 존재 여부 확인 함수
      async function getExistingImagePath(baseName, index) {
        const exts = ["png", "jpg"];
        for (const ext of exts) {
          const path = `./images/${baseName}${index}.${ext}`;
          try {
            const res = await fetch(path, { method: "HEAD" });
            if (res.ok) return path;
          } catch (e) {}
        }
        return null;
      }

      // 이미지 배열 생성
      for (let i = 1; i <= maxImages; i++) {
        const path = await getExistingImagePath(classFolder, i);
        if (path) images.push(path);
      }

      const links = [
        `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(data.ko_name)}`,
        `https://www.musinsa.com/search/musinsa/integration?keyword=${encodeURIComponent(data.ko_name)}`,
        `https://www.spao.com/product/search.html?keyword=${encodeURIComponent(data.ko_name)}`
      ];

      $shopLinks.innerHTML = "";
      const slideWrapper = document.createElement("div");
      slideWrapper.className = "slide-wrapper";

      images.forEach((src, i) => {
        const linkEl = document.createElement("a");
        linkEl.href = links[i % links.length];
        linkEl.target = "_blank";

        const imgEl = document.createElement("img");
        imgEl.src = src;
        imgEl.alt = classFolder;

        linkEl.appendChild(imgEl);
        slideWrapper.appendChild(linkEl);
      });

      $shopLinks.appendChild(slideWrapper);
      $shopLinks.style.display = "flex";
      document.getElementById("shopTitle").style.display = "block";

      // 슬라이드 애니메이션
      let currentIndex = 0;
      const total = images.length;

      function updateSlide() {
        const slideWrapper = document.querySelector(".slide-wrapper");
        const wrapperWidth = $shopLinks.clientWidth;
        const imgEl = slideWrapper.querySelectorAll("img")[currentIndex];
        if (!imgEl) return;
        const imgWidth = imgEl.clientWidth;
        const offset = imgEl.offsetLeft + imgWidth / 2 - wrapperWidth / 2;
        slideWrapper.style.transform = `translateX(${-offset}px)`;
      }

      const imgElements = slideWrapper.querySelectorAll("img");
      let loadedCount = 0;
      imgElements.forEach(img => {
        img.onload = () => {
          loadedCount++;
          if (loadedCount === imgElements.length) updateSlide();
        };
      });

      setInterval(() => {
        currentIndex = (currentIndex + 1) % total;
        updateSlide();
      }, 5000);
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

    await new Promise(resolve => {
      $video.onloadedmetadata = () => { $video.play(); resolve(); };
    });

    $captureBtn.className = "capture-circle";
    $previewWrapper.appendChild($captureBtn);

    $captureBtn.addEventListener("click", async () => {
      $canvas.width = $video.videoWidth;
      $canvas.height = $video.videoHeight;
      $canvas.getContext("2d").drawImage($video, 0, 0);

      const blob = await new Promise(resolve => $canvas.toBlob(resolve, "image/png"));
      stream.getTracks().forEach(track => track.stop());

      $preview.src = URL.createObjectURL(blob);
      $previewWrapper.innerHTML = "";
      $previewWrapper.appendChild($preview);

      $scanLine.className = "scan-line";
      $scanLine.id = "scan-line";
      $previewWrapper.appendChild($scanLine);

      $file._cameraBlob = blob;
      $loader.style.display = "inline-block";
      $scanLine.style.display = "block";
      $btn.click();
    });

  } catch (err) {
    alert("카메라를 사용할 수 없습니다: " + err.message);
  }
});

// 5분마다 서버 ping
setInterval(async () => {
  try {
    const res = await fetch("https://backend-6i2t.onrender.com/ping");
    if (res.ok) console.log("서버 ping 성공");
  } catch (err) {
    console.warn("서버 ping 실패:", err);
  }
}, 5 * 60 * 1000);
