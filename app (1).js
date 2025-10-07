const API = "https://backend-6i2t.onrender.com/predict";

const $dropArea = document.getElementById("drop-area");
const $file = document.getElementById("file");
const $preview = document.getElementById("preview");
const $btn = document.getElementById("btn");
const $result = document.getElementById("result");
const $loader = document.getElementById("loading");
const $scanLine = document.querySelector(".scan-line");

// 드래그 앤 드롭
["dragenter", "dragover"].forEach(eventName => {
  $dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
    $dropArea.classList.add("highlight");
  }, false);
});

["dragleave", "drop"].forEach(eventName => {
  $dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
    $dropArea.classList.remove("highlight");
  }, false);
});

$dropArea.addEventListener("drop", e => {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    $file.files = files;
    showPreview(files[0]);
  }
});

// 파일 선택 시 미리보기
$file.addEventListener("change", () => {
  if ($file.files.length > 0) {
    showPreview($file.files[0]);
  }
});

function showPreview(file) {
  const reader = new FileReader();
  reader.onload = e => {
    $preview.onload = () => {
      const scanLine = document.getElementById("scan-line");
      scanLine.style.width = $preview.clientWidth + "px";
    };
    $preview.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 서버 업로드 & 예측
$btn.addEventListener("click", async () => {
  const f = $file.files[0];
  if (!f) {
    alert("이미지를 선택하세요!");
    return;
  }
  predictImage(f);
});

// 서버 예측 함수
async function predictImage(fileBlob) {
  const fd = new FormData();
  fd.append("file", fileBlob);

  $loader.style.display = "inline-block";
  $scanLine.style.display = "block";
  $result.textContent = "";

  try {
    const res = await fetch(API, { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "요청 실패");

    if (json.predictions && json.predictions.length > 0) {
      let text = "Top Predictions:\n";
      json.predictions.forEach((p, idx) => {
        text += `${idx + 1}. Label: ${p.label}\n`;
      });
      $result.textContent = text;
    } else if (json.error) {
      $result.textContent = "백엔드 에러: " + json.error;
    } else {
      $result.textContent = "예측 결과를 받지 못했습니다.";
    }
  } catch (e) {
    $result.textContent = "에러: " + e.message;
  } finally {
    $loader.style.display = "none";
    $scanLine.style.display = "none";
  }
}

// 카메라 촬영 버튼
const $cameraBtn = document.getElementById("camera-btn");

$cameraBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { exact: "environment" } },
      audio: false
    });

    const video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    video.width = 300;
    video.height = 200;

    const previewWrapper = document.querySelector(".preview-wrapper");
    previewWrapper.innerHTML = "";
    previewWrapper.appendChild(video);

    const captureBtn = document.createElement("div");
    captureBtn.className = "capture-circle";
    previewWrapper.appendChild(captureBtn);

    captureBtn.addEventListener("click", async () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));

      // 스트림 종료
      stream.getTracks().forEach(track => track.stop());

      // 미리보기 + 스캔라인 복원
      $preview.src = URL.createObjectURL(blob);
      previewWrapper.innerHTML = "";
      previewWrapper.appendChild($preview);
      const scanLine = document.createElement("div");
      scanLine.className = "scan-line";
      scanLine.id = "scan-line";
      previewWrapper.appendChild(scanLine);

      // 바로 예측
      predictImage(blob);
    });

  } catch (err) {
    alert("후면 카메라를 사용할 수 없습니다: " + err.message);
  }
});
