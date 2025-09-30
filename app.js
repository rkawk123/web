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
  $result.textContent = "예측 중...";

  try {
    const res = await fetch(API, { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "요청 실패");

    $result.textContent =
      `Label: ${json.label}\nIndex: ${json.class_index}\nConfidence: ${(json.confidence * 100).toFixed(2)}%`;
  } catch (e) {
    $result.textContent = "에러: " + e.message;
  }
});
