/*
// const API = "https://backend-fgai.onrender.com/predict"; // 기존
const API = "https://backend-6i2t.onrender.com/predict";

const $file = document.getElementById("file");
const $btn = document.getElementById("btn");
const $result = document.getElementById("result");
const $preview = document.getElementById("preview");

$file.addEventListener("change", () => {
  const f = $file.files[0];
  if (f) $preview.src = URL.createObjectURL(f);
});

$btn.addEventListener("click", async () => {
  const f = $file.files[0];
  if (!f) { alert("이미지를 선택하세요!"); return; }

  const fd = new FormData();
  fd.append("file", f);
  
  loader.style.display = "block"; // 🔵 로딩 보이기
  result.textContent = "";

  try {
    const res = await fetch(API, { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "요청 실패");

    $result.textContent =
      `Label: ${json.label}\nIndex: ${json.class_index}\nConfidence: ${(json.confidence * 100).toFixed(2)}%`;
  } catch (e) {
    $result.textContent = "에러: " + e.message;
  } finally {
    loader.style.display = "none"; // 🔴 로딩 숨기기
  }
});
#
const $file = document.getElementById("file");
const $btn = document.getElementById("btn");
const $result = document.getElementById("result");
const $preview = document.getElementById("preview");
const loader = document.getElementById("loader"); // 👈 추가

$file.addEventListener("change", () => {
  const f = $file.files[0];
  if (f) $preview.src = URL.createObjectURL(f);
});

$btn.addEventListener("click", async () => {
  const f = $file.files[0];
  if (!f) { alert("이미지를 선택하세요!"); return; }

  const fd = new FormData();
  fd.append("file", f);
  
  $result.textContent = "";
  loader.style.display = "block"; // 🔵 로딩 보이기

  try {
    const res = await fetch(API, { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "요청 실패");

    $result.textContent =
      `Label: ${json.label}\nIndex: ${json.class_index}\nConfidence: ${(json.confidence * 100).toFixed(2)}%`;
  } catch (e) {
    $result.textContent = "에러: " + e.message;
  } finally {
    loader.style.display = "none"; // 🔴 로딩 숨기기
  }
});
*/
const API = "https://backend-6i2t.onrender.com/predict"; // 👉 실제 API 주소로 수정

const $dropArea = document.getElementById("drop-area");
const $file = document.getElementById("file");
const $preview = document.getElementById("preview");
const $btn = document.getElementById("btn");
const $result = document.getElementById("result");
const $loader = document.getElementById("loader");

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

// 파일 선택 & 미리보기
$file.addEventListener("change", () => {
  if ($file.files.length > 0) {
    showPreview($file.files[0]);
  }
});

function showPreview(file) {
  const reader = new FileReader();
  reader.onload = e => {
    $preview.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 서버 업로드 & 결과 표시
$btn.addEventListener("click", async () => {
  const f = $file.files[0];
  if (!f) { alert("이미지를 선택하세요!"); return; }

  const fd = new FormData();
  fd.append("file", f);

  $result.textContent = "";
  $loader.style.display = "block";

  try {
    const res = await fetch(API, { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "요청 실패");

    $result.textContent =
      `Label: ${json.label}\nIndex: ${json.class_index}\nConfidence: ${(json.confidence * 100).toFixed(2)}%`;
  } catch (e) {
    $result.textContent = "에러: " + e.message;
  } finally {
    $loader.style.display = "none";
  }
});


