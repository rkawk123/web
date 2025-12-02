// =========================
// API 설정
// =========================
const API = "https://backend-6i2t.onrender.com/predict";
const API_STREAM = "https://backend-6i2t.onrender.com/predict_stream"; // 스트리밍용
const API_BASE = "https://backend-6i2t.onrender.com";
const API_guestbook = "https://backend-6i2t.onrender.com/guestbook";

// =========================
// DOM 요소 선택
// =========================
const $dropArea = document.getElementById("drop-area");
const $file = document.getElementById("file");
const $preview = document.getElementById("preview");
const $btn = document.getElementById("btn");
const $cropBtn = document.getElementById("crop-btn");
const $wrongBtn = document.getElementById("wrongBtn");
const $correctionForm = document.getElementById("correctionForm");
const $result = document.getElementById("result");
const $loader = document.getElementById("loading");
const $scanLine = document.querySelector(".scan-line");
const $resultText = document.getElementById("resultText");
const $cameraBtn = document.getElementById("camera-btn");
const $previewWrapper = document.querySelector(".preview-wrapper");
const $captureBtn = document.createElement("div");
const $video = document.createElement("video");
const $canvas = document.createElement("canvas");
const $shopTitle = document.getElementById("shopTitle");
const $shopLinks = document.getElementById("shopLinks");
const $status = document.getElementById("status");
const $actionButtons = document.querySelector(".action-buttons");
const $resultBox = document.getElementById("resultBox") || document.querySelector(".result-box");
const $feedbackSection = document.getElementById("feedbackSection");
const $toggle = document.getElementById("modeToggle");
const $tooltip = document.getElementById("tooltip");
const $toggleWrapper = document.querySelector(".toggle-switch");
const $container = document.getElementById("progressBarsContainer");
const $predictStatus = document.getElementById("predictStatusMessage"); // (HTML엔 없어도 됨, 있으면 상태 표시)

const $comparePanel = document.getElementById("comparePanel");
const $compareSlots = document.getElementById("compareSlots");
const $btnCompareStart = document.getElementById("btnCompareStart");
const $btnNew = document.getElementById("btnNew");

// 정정 피드백
const $submitCorrection = document.getElementById("submitCorrection");
const $correctLabel = document.getElementById("correctLabel");

// 기타
const $analysis = document.querySelector(".analysis-row");

// 전역 상태
let cropper = null;
const MAX_COMPARE = 4;

if (!window.__fabric_slide_interval_id) {
  window.__fabric_slide_interval_id = null;
}

// 전역 상태 값 (피드백용)
window.uploadedFile = null;
window.predictedClass = null;

// 데모 모드 상태
let demoRunning = false;
let idleTimer = null;
let demoFiles = [];

// 백업(비교) 상태
let compareHistory = []; // { html, img }
let compareActive = false;

// 카메라 캡처 버튼 등록 여부
let captureBtnRegistered = false;

// =========================
// 드래그 & 드롭
// =========================
if ($dropArea) {
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
      if ($file) $file.files = files;
      if ($shopTitle) $shopTitle.style.display = "none";
      showPreview(files[0]);
    }
  });
}

// 파일 업로드
if ($file) {
  $file.addEventListener("change", () => {
    if ($file.files.length > 0) {
      if ($shopTitle) $shopTitle.style.display = "none";
      showPreview($file.files[0]);
    }
  });
}

// =========================
// 미리보기 표시 + 스캔라인 폭 조정
// =========================
function showPreview(fileOrBlob) {
  const reader = new FileReader();
  reader.onload = e => {
    if (!$preview) return;

    $preview.onload = () => {
      if ($scanLine) {
        $scanLine.style.width = $preview.clientWidth + "px";
        $scanLine.style.left = $preview.offsetLeft + "px";
      }
      $preview.style.display = "block";
    };
    $preview.src = e.target.result;

    // 상태 리셋
    if ($result) $result.textContent = "";
    if ($resultText) $resultText.innerHTML = "";
    if ($shopLinks) {
      $shopLinks.style.display = "none";
      $shopLinks.innerHTML = "";
    }
    if ($shopTitle) $shopTitle.style.display = "none";
    if ($container) $container.innerHTML = "";
    if ($status) $status.innerText = "";
    if ($predictStatus) $predictStatus.innerText = "";

    if ($previewWrapper) {
      $previewWrapper.classList.add("has-image");
    }
    if ($cropBtn) {
      $cropBtn.style.display = "block"; // 이미지를 올리면 크롭 버튼 보이게
    }

    // 피드백용 전역 이미지 저장
    window.uploadedFile = fileOrBlob;
  };
  reader.readAsDataURL(fileOrBlob);
}

// =========================
// "예측이 틀렸어요" → 말풍선 토글
// =========================
if ($wrongBtn && $correctionForm) {
  $correctionForm.style.display = "none";

  $wrongBtn.addEventListener("click", () => {
    if ($correctionForm.style.display === "none" || $correctionForm.style.display === "") {
      $correctionForm.style.display = "flex";
      if ($feedbackSection) $feedbackSection.style.display = "block";
    } else {
      $correctionForm.style.display = "none";
    }
  });
}

// =========================
// 토스트 메시지 (백업/공통용)
// =========================
function showMessage(msg, duration = 2000) {
  const box = document.getElementById("message-box");
  if (!box) {
    alert(msg);
    return;
  }

  box.textContent = msg;
  box.classList.add("show");

  if (box._hideTimer) clearTimeout(box._hideTimer);

  box._hideTimer = setTimeout(() => {
    box.classList.remove("show");
  }, duration);
}

// =========================
// 데모/일반 모드 토글 툴팁
// =========================
function updateTooltipText() {
  if (!$toggle || !$tooltip) return;
  if ($toggle.checked) {
    $tooltip.textContent = "데모 모드입니다!";
  } else {
    $tooltip.textContent = "일반 모드입니다! 직접 체험해보세요!";
  }
}

if ($toggleWrapper && $tooltip && $toggle) {
  $toggleWrapper.addEventListener("mouseenter", () => {
    updateTooltipText();
    $tooltip.style.opacity = "1";
  });
  $toggleWrapper.addEventListener("mouseleave", () => {
    $tooltip.style.opacity = "0";
  });
  $toggle.addEventListener("change", updateTooltipText);
}

// =========================
// 이미지 크롭 기능 (Cropper.js) — 자동 적용 버전 (네 코드 기준)
// =========================
if ($cropBtn && $preview) {
  $cropBtn.addEventListener("click", () => {
    if (!$preview.src) {
      alert("먼저 이미지를 업로드하세요!");
      return;
    }

    // 기존 cropper 제거
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }

    // 크롭 시작
    cropper = new Cropper($preview, {
      viewMode: 1,
      autoCrop: false,
      background: false,
      modal: true,
      movable: true,
      zoomable: true,

      // 드래그로 박스 선택 끝났을 때 자동 반영
      cropend() {
        cropper.getCroppedCanvas().toBlob((blob) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            // 미리보기 갱신
            $preview.src = e.target.result;

            // 업로드 상태 갱신
            if ($file) $file._cameraBlob = blob;
            window.uploadedFile = blob;

            // 종료
            cropper.destroy();
            cropper = null;
          };
          reader.readAsDataURL(blob);
        }, "image/png");
      }
    });
  });
}

// =========================
// 초기 상태로 완전 리셋 (공통)
// =========================
function goToInitialState() {

  // 🔥 파일 입력 초기화
  if ($file) {
    $file.value = "";
    $file._cameraBlob = null;
  }

  // 🔥 미리보기 초기화
  if ($preview) {
    $preview.src = "";
    $preview.style.display = "none";
  }

  if ($previewWrapper) {
    $previewWrapper.innerHTML = "";
    $previewWrapper.appendChild($preview);
    if ($scanLine) $previewWrapper.appendChild($scanLine);
    $previewWrapper.classList.remove("has-image");
  }

  // 🔥 결과 초기화
  if ($result) $result.innerHTML = "";
  if ($container) $container.innerHTML = "";
  if ($resultText) $resultText.innerHTML = "";

  // 🔥 결과 박스 비활성화
  if ($resultBox) $resultBox.classList.remove("active");

  // 🔥 action 버튼(백업/새로 분석) 숨김 ← 백업 기록은 유지됨
  if ($btnCompareStart) $btnCompareStart.style.display = "none";
  if ($btnNew) $btnNew.style.display = "none";

  // 🔥 피드백 숨김
  if ($feedbackSection) $feedbackSection.style.display = "none";
  if ($correctionForm) $correctionForm.style.display = "none";

  // 🔥 쇼핑몰 추천 초기화
  if ($shopLinks) {
    $shopLinks.style.display = "none";
    $shopLinks.innerHTML = "";
  }
  if ($shopTitle) $shopTitle.style.display = "none";

  // 🔥 상태 메시지 초기화
  if ($status) $status.innerText = "";
  if ($predictStatus) $predictStatus.innerText = "";

  // 🔥 크롭 버튼 숨기기 (새 이미지 선택하면 다시 나타남)
  const cropBtn = document.getElementById("crop-btn");
  if (cropBtn) cropBtn.style.display = "none";

  // 🔥 자동 슬라이드 초기화
  if (window.__fabric_slide_interval_id) {
    clearInterval(window.__fabric_slide_interval_id);
    window.__fabric_slide_interval_id = null;
  }

  // 내부 상태 리셋
  window.uploadedFile = null;
  window.predictedClass = null;

  // 🔥 comparePanel / compareHistory는 절대 건드리지 않음!!
  // goToInitialState 마지막 부분에 추가
  setTimeout(() => {
    if (compareHistory.length > 0) {
        $comparePanel.style.display = "block";
    }
  }, 0);
}


// ============================
// 📦 백업(비교) 시스템 (팀원 로직 기반)
// ============================
if ($btnCompareStart) $btnCompareStart.style.display = "none";
if ($btnNew) $btnNew.style.display = "none";

function saveCurrentResultSnapshot() {
  const imgSrc = $preview?.src || "";

  const html = `
    <div class="raw-result">${$result.innerHTML}</div>
    <div class="raw-bars">${$container.innerHTML}</div>
    <div class="raw-text">${$resultText.innerHTML}</div>
  `;

  return { img: imgSrc, html };
}


function renderCompareSlots() {
  $compareSlots.innerHTML = "";

  // 비교 기록이 0개면 패널 숨김
  if (compareHistory.length === 0) {
    $comparePanel.style.display = "none";
    return;
  }

  // compareHistory가 있으면 반드시 comparePanel 표시
  $comparePanel.style.display = "block";

  compareHistory.forEach((item, idx) => {
    const slot = document.createElement("div");
    slot.className = "compare-card";

    slot.innerHTML = `
      <button class="compare-delete" data-idx="${idx}">×</button>
      <div class="compare-image">
        <img src="${item.img}" />
      </div>
      <div class="compare-result">${item.html}</div>
    `;

    $compareSlots.appendChild(slot);
  });

  document.querySelectorAll(".compare-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.idx);
      compareHistory.splice(i, 1);
      renderCompareSlots();
    });
  });
}



function handleCompareStart() {
  const hasResult =
    ($result && $result.innerHTML.trim()) ||
    ($resultText && $resultText.innerHTML.trim());

  if (!hasResult) {
    showMessage("먼저 예측을 완료해주세요!");
    return;
  }

  const snap = saveCurrentResultSnapshot();
  const last = compareHistory[compareHistory.length - 1];

  if (!last || last.html !== snap.html) {
    compareHistory.push(snap);
  }

  compareActive = true;
  if ($comparePanel) $comparePanel.style.display = "block";
  renderCompareSlots();

  if (compareHistory.length >= MAX_COMPARE) {
    showMessage("최대 4개까지 기록됩니다. 새로 분석하기만 가능해요!");
  }
}

function handleNewAnalysis() {
  compareActive = true;  // 비교 기능 유지
  // → 기존 백업 유지!
  renderCompareSlots();  
  // 🔥 goToInitialState(false) → "결과만 초기화"
  goToInitialState(false);
}

// 이벤트 연결 그대로 유지
if ($btnCompareStart) {
  $btnCompareStart.addEventListener("click", handleCompareStart);
}
if ($btnNew) {
  $btnNew.addEventListener("click", handleNewAnalysis);
}


// =========================
// 데모 모드 (팀원 코드 기반 + 통합)
// =========================

// 랜덤 파일 선택
function pickRandomFile() {
  return demoFiles[Math.floor(Math.random() * demoFiles.length)];
}

// 파일 목록 로드
async function loadDemoFiles() {
  const res = await fetch(`${API_BASE}/demo_files`);
  const data = await res.json();
  demoFiles = data.files || [];
}

// Promise 대기
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 데모 루프
async function startDemoLoop() {
  if (demoRunning) return;
  demoRunning = true;

  while (demoRunning) {
    const fileName = pickRandomFile();
    if (!fileName) break;

    const blob = await fetch(`${API_BASE}/image/${encodeURIComponent(fileName)}`).then(r => r.blob());

    // 미리보기 표시
    showPreview(blob);
    // 예측 실행
    await runPrediction(blob);

    // 10초 대기
    await wait(10000);

    // 자동 백업
    handleCompareStart();

    // 2초 대기
    await wait(2000);

    // 최대 4개 쌓이면 자동 초기화
    if (compareHistory.length >= MAX_COMPARE) {
      handleNewAnalysis();
    }
  }
}

function stopDemoLoop() {
  demoRunning = false;
  goToInitialState();
}

// UI 잠금/해제
function lockUIForDemo() {
  if ($dropArea) $dropArea.style.pointerEvents = "none";
  if ($file) $file.disabled = true;
  if ($cameraBtn) $cameraBtn.style.display = "none";
  if ($btn) $btn.style.display = "none";
}
function unlockUI() {
  if ($dropArea) $dropArea.style.pointerEvents = "auto";
  if ($file) $file.disabled = false;
  if ($cameraBtn) $cameraBtn.style.display = "inline-block";
  if ($btn) $btn.style.display = "inline-block";
}

// 토글 스위치로 데모 모드 제어
if ($toggle) {
  $toggle.addEventListener("change", () => {
    if ($toggle.checked) {
      lockUIForDemo();
      startDemoLoop();
    } else {
      stopDemoLoop();
      unlockUI();
    }
    updateTooltipText();
  });
}

// 3분 Idle → 자동 데모 ON
function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);

  idleTimer = setTimeout(() => {
    if ($toggle) {
      $toggle.checked = true;
      lockUIForDemo();
      startDemoLoop();
      updateTooltipText();
    }
  }, 3 * 60 * 1000);
}

window.addEventListener("load", async () => {
  try {
    await loadDemoFiles();
  } catch (e) {
    console.warn("데모 파일 로드 실패:", e);
  }
  resetIdleTimer();
});

window.addEventListener("click", resetIdleTimer);
window.addEventListener("mousemove", resetIdleTimer);
window.addEventListener("keydown", resetIdleTimer);

// =========================
// 서버 업로드 및 예측 (스트리밍 사용) — 통합 runPrediction
// =========================
async function runPrediction(uploadFile) {
  if (!uploadFile) {
    alert("이미지를 선택하거나 촬영하세요!");
    return;
  }

  if ($predictStatus) $predictStatus.innerText = "예측 중...";

  if ($resultBox) $resultBox.classList.remove("active");
  if ($actionButtons) {
    $actionButtons.classList.remove("show");
    $actionButtons.style.display = "none";
  }
  if ($feedbackSection) $feedbackSection.style.display = "none";
  if ($correctionForm) $correctionForm.style.display = "none";

  if ($previewWrapper) $previewWrapper.classList.add("has-image");
  if ($cropBtn) $cropBtn.style.display = "none";

  const fd = new FormData();
  fd.append("file", uploadFile);
  fd.append("demo", demoRunning ? "1" : "0");

  if ($loader) $loader.style.display = "inline-block";
  if ($scanLine) $scanLine.style.display = "block";

  if ($result) $result.textContent = "";
  if ($resultText) $resultText.innerHTML = "";
  if ($shopLinks) {
    $shopLinks.style.display = "none";
    $shopLinks.innerHTML = "";
  }
  if ($shopTitle) $shopTitle.style.display = "none";
  if ($container) $container.innerHTML = "";
  if ($status) $status.innerText = "";

  if (window.__fabric_slide_interval_id) {
    clearInterval(window.__fabric_slide_interval_id);
    window.__fabric_slide_interval_id = null;
  }

  try {
    const res = await fetch(API_STREAM, { method: "POST", body: fd });

    if (!res.ok) {
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
      chunk = lines.pop();

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

        if (parsed.status && $status) {
          $status.innerText = parsed.status;
        }

        if (parsed.result) {
          const r = parsed.result;

          // 프로그래스바 (네 코드 기준, 클래스명 progress-bar 유지)
          if (r?.predictions?.length && $container) {
            let progressBarsHtml = "";

            r.predictions.forEach((p) => {
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

            $container.innerHTML = progressBarsHtml;

            $container.style.opacity = 0;
            $container.style.transform = "translateY(20px)";
            $container.style.transition = "opacity 0.5s, transform 0.5s";

            setTimeout(() => {
              $container.style.opacity = 1;
              $container.style.transform = "translateY(0)";

              $container.querySelectorAll(".progress-bar").forEach((bar) => {
                const percent = bar.dataset.percent;
                bar.style.transition = "width 1.2s cubic-bezier(.42,0,.58,1)";
                bar.style.width = percent + "%";
              });
            }, 100);

            if ($result) $result.textContent = "";
          } else if (parsed.error && $result) {
            $result.textContent = "백엔드 에러: " + parsed.error;
          }

          // 상세 정보 + 쇼핑몰 슬라이드 (팀원 코드 기반)
          if (r.ko_name) {
            const koName = r.ko_name || "";
            const predictedFabric = r.predicted_fabric || "";
            const wash = r.wash_method || "정보 없음";
            const dry = r.dry_method || "정보 없음";
            const special = r.special_note || "정보 없음";

            if ($resultText) {
              $resultText.innerHTML = `
                <h3>${koName} (${predictedFabric})</h3>
                <p>🧺 세탁법: ${wash}</p>
                <p>🌬️ 건조법: ${dry}</p>
                <p>⚠️ 주의사항: ${special}</p>
              `;
            }

            if ($resultBox) $resultBox.classList.add("active");
            if ($actionButtons) {
              $actionButtons.style.display = "flex";
              $actionButtons.classList.add("show");
            }
            if ($feedbackSection) $feedbackSection.style.display = "block";

            window.predictedClass = predictedFabric || koName;
            window.uploadedFile = uploadFile;

            const fabric = (predictedFabric || "").toLowerCase();
            const query = encodeURIComponent(koName || predictedFabric);

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

            if ($shopLinks) {
              $shopLinks.innerHTML = shopLinksData
                .map(shop => `
                  <a href="${shop.url}" target="_blank" class="shop-link">
                    ${shop.images.map((img, i) => `
                      <img src="${img}" alt="${shop.name} 이미지 ${i + 1}" class="${i === 0 ? "active" : ""}">
                    `).join("")}
                  </a>
                `)
                .join("");
              $shopLinks.style.display = "flex";
            }
            if ($shopTitle) $shopTitle.style.display = "block";

            if (window.__fabric_slide_interval_id) {
              clearInterval(window.__fabric_slide_interval_id);
              window.__fabric_slide_interval_id = null;
            }

            let currentSlide = 0;
            window.__fabric_slide_interval_id = setInterval(() => {
              if (!$shopLinks) return;
              $shopLinks.querySelectorAll("a").forEach((aTag) => {
                const imgs = aTag.querySelectorAll("img");
                imgs.forEach((img, i) => {
                  img.classList.toggle("active", i === (currentSlide % imgs.length));
                });
              });
              currentSlide++;
            }, 2000);
          }

          if ($predictStatus) $predictStatus.innerText = "예측 완료!";
        }

        if (parsed.error) {
          if ($result) $result.textContent = "백엔드 에러: " + parsed.error;
          if ($resultText) $resultText.innerText = "백엔드 에러: " + parsed.error;
          if ($predictStatus) $predictStatus.innerText = "에러가 발생했습니다.";
        }
      }
    }

    const trailing = chunk.trim();
    if (trailing) {
      try {
        const parsed = JSON.parse(trailing);
        if (parsed.status && $status) $status.innerText = parsed.status;
      } catch (e) {
        console.warn("마지막 청크 JSON 파싱 실패:", trailing);
      }
    }
  } catch (e) {
    if ($result) $result.textContent = "에러: " + (e.message || e);
    if ($resultText) $resultText.innerText = "에러: " + (e.message || e);
    if ($predictStatus) $predictStatus.innerText = "에러가 발생했습니다.";
  } finally {
    if ($loader) $loader.style.display = "none";
    if ($scanLine) $scanLine.style.display = "none";

    // 데모 모드가 아닐 때만 수동 백업 버튼 표시
    if (!demoRunning) {
      if ($btnCompareStart) $btnCompareStart.style.display = "inline-block";
      if ($btnNew) $btnNew.style.display = "inline-block";
    }
  }
}

// 버튼 클릭 → 예측 실행
if ($btn) {
  $btn.addEventListener("click", async () => {
    let uploadFile =
      ($file && $file.files && $file.files[0]) ||
      ($file && $file._cameraBlob) ||
      window.uploadedFile;

    if (!uploadFile) {
      alert("이미지를 선택하거나 촬영하세요!");
      return;
    }

    await runPrediction(uploadFile);
  });
}

// =========================
// 카메라 촬영 (팀원 코드 기반 + 촬영 버튼 표시 수정)
// =========================

// 캡처 버튼 이벤트 등록 (1회만)
function registerCaptureOnce() {
  if (captureBtnRegistered) return;
  captureBtnRegistered = true;

  $captureBtn.addEventListener("click", async () => {
    $canvas.width = $video.videoWidth;
    $canvas.height = $video.videoHeight;
    $canvas.getContext("2d").drawImage($video, 0, 0);

    const blob = await new Promise(resolve =>
      $canvas.toBlob(resolve, "image/png")
    );

    const stream = $video.srcObject;
    if (stream) stream.getTracks().forEach(track => track.stop());

    showPreview(blob);
    if ($previewWrapper) {
      $previewWrapper.innerHTML = "";
      $previewWrapper.appendChild($preview);
      if ($scanLine) $previewWrapper.appendChild($scanLine);
    }

    if ($file) $file._cameraBlob = blob;
    window.uploadedFile = blob;

    // 자동으로 예측 실행
    if ($btn) $btn.click();
  });
}

// 카메라 시작 함수
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });

    if ($result) $result.textContent = "";
    if ($resultText) $resultText.innerHTML = "";
    if ($shopLinks) $shopLinks.style.display = "none";
    if ($shopTitle) $shopTitle.style.display = "none";
    if ($container) $container.innerHTML = "";
    if ($status) $status.innerText = "";

    $video.srcObject = stream;
    $video.autoplay = true;
    $video.playsInline = true;

    if ($previewWrapper) {
      $previewWrapper.innerHTML = "";
      $previewWrapper.appendChild($video);
    }

    await new Promise(resolve => {
      $video.onloadedmetadata = () => {
        $video.play();
        resolve();
      };
    });

    $captureBtn.className = "capture-circle";
    if ($previewWrapper) {
      $previewWrapper.appendChild($captureBtn); // ★ 촬영 버튼 DOM에 추가
    }

    registerCaptureOnce();
  } catch (err) {
    alert("카메라를 사용할 수 없습니다: " + err.message);
  }
}

if ($cameraBtn) {
  $cameraBtn.addEventListener("click", startCamera);
}

// =========================
// 5분마다 서버 ping
// =========================
setInterval(async () => {
  try {
    const res = await fetch("https://backend-6i2t.onrender.com/ping");
    if (res.ok) {
      console.log("서버 ping 성공");
    }
  } catch (err) {
    console.warn("서버 ping 실패:", err);
  }
}, 5 * 60 * 1000);

// =========================
// ⭐ 방명록 서버 API 연결 ⭐ (네 코드 기준)
// =========================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const feed = document.getElementById("guestbookFeed");

  if (!form || !feed) return;

  async function loadGuestbook() {
    feed.innerHTML = "";
    const res = await fetch(API_guestbook);
    const list = await res.json();

    list.forEach(item => {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${item.name}</strong>
        <div class="date">${item.created_at}</div>
        <p>${item.message}</p>
        ${item.contactInfo ? `<small>연락처: ${item.contactInfo}</small>` : ""}
        <button class="deleteBtn" data-id="${item.id}">삭제</button>
      `;
      feed.appendChild(li);
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const contactInfo = document.getElementById("contactInfo").value.trim();
    const message = document.getElementById("message").value.trim();

    if (!name || !message) {
      alert("이름과 메모는 필수입니다!");
      return;
    }

    await fetch(API_guestbook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contactInfo, message })
    });

    form.reset();
    loadGuestbook();
  });

  feed.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("deleteBtn")) return;

    const id = e.target.dataset.id;

    if (confirm("정말 삭제할까요?")) {
      await fetch(`${API_guestbook}/${id}`, {
        method: "DELETE"
      });
      loadGuestbook();
    }
  });

  loadGuestbook();
});

// =========================
// 정정 피드백 제출
// =========================
if ($submitCorrection && $correctLabel) {
  $submitCorrection.addEventListener("click", () => {
    const corrected = $correctLabel.value;

    if (!window.uploadedFile) {
      alert("이미지가 없습니다. 다시 업로드해주세요.");
      return;
    }
    if (!window.predictedClass) {
      alert("예측 결과가 아직 없습니다.");
      return;
    }

    sendFeedback(window.predictedClass, corrected, window.uploadedFile);
  });
}

async function sendFeedback(predicted, corrected, file) {
  const formData = new FormData();
  formData.append("predicted", predicted);
  formData.append("corrected", corrected);
  formData.append("image", file);

  try {
    const res = await fetch("https://feedback-server-derm.onrender.com/feedback", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    console.log("Feedback response:", data);
    alert("정정 정보가 성공적으로 전송되었습니다! 감사합니다 😊");
  } catch (err) {
    alert("정정 정보 전송 중 오류가 발생했습니다: " + err.message);
  }
}
