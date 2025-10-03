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

// 파일 선택 시 미리보기 # 메모리 적게 차지
$file.addEventListener("change", () => {
  if ($file.files.length > 0) {
    showPreview($file.files[0]);
  }
});

function showPreview(file) {
  const reader = new FileReader();
  reader.onload = e => {
    $preview.onload = () => {
      // 이미지 로드된 후 scan-line 크기 맞춤
      const scanLine = document.getElementById("scan-line");
      scanLine.style.width = $preview.clientWidth + "px";
    };
    $preview.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

//서버 업로드 & 예측
$btn.addEventListener("click", async () => {
  const f = $file.files[0];
  if (!f) {
    alert("이미지를 선택하세요!");
    return;
  }

  const fd = new FormData();
  fd.append("file", f);

  // 로딩 시작
  $loader.style.display = "inline-block";
  $scanLine.style.display = "block"; //스캔 시작
  $result.textContent = "";

  try {
    const res = await fetch(API, { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "요청 실패");

    // 백엔드 predictions 배열 구조에 맞춰 출력
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
    // 요청 끝나면 로딩 숨김
    $loader.style.display = "none";
    $scanLine.style.display = "none"; //스캔 종료
  }
});



