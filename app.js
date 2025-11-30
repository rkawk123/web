// =========================
// API 설정
// =========================
const API = "https://backend-6i2t.onrender.com/predict";
const API_STREAM = "https://backend-6i2t.onrender.com/predict_stream"; // 스트리밍용

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
const $resultBox = document.querySelector(".result-box");
const $feedbackSection = document.getElementById("feedbackSection");
const $toggle = document.getElementById("modeToggle");
const $tooltip = document.getElementById("tooltip");
const $toggleWrapper = document.querySelector(".toggle-switch");
const $container = document.getElementById("progressBarsContainer");
const $predictStatus = document.getElementById("predictStatusMessage"); // 드롭존 아래 상태 문구

// 비교 관련
const $comparePanel = document.getElementById("comparePanel");
const $compareSlots = document.getElementById("compareSlots");
const $btnCompareStart = document.getElementById("btnCompareStart");
const $btnNew = document.getElementById("btnNew");

if ($btnCompareStart) $btnCompareStart.style.display = "none";
if ($btnNew) $btnNew.style.display = "none";

const MAX_COMPARE = 4;

let cropper;                  // Cropper 인스턴스
let compareHistory = [];      // [{ html, img }]
let compareMode = false;      // 비교 모드 on/off
let lastResultSnapshot = null; // 마지막 예측 결과 스냅샷

// 슬라이드 interval id
if (!window.__fabric_slide_interval_id) {
  window.__fabric_slide_interval_id = null;
}

// =========================
// 드래그 & 드롭
// =========================
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
    if ($shopTitle) $shopTitle.style.display = "none";
    showPreview(files[0]);
  }
});

$file.addEventListener("change", () => {
  if ($file.files.length > 0) {
    if ($shopTitle) $shopTitle.style.display = "none";
    showPreview($file.files[0]);
  }
});

// =========================
// 미리보기 표시 + 스캔라인 폭 조정
// =========================
function showPreview(fileOrBlob) {
  const reader = new FileReader();
  reader.onload = e => {
    $preview.onload = () => {
      if ($scanLine) {
        $scanLine.style.width = $preview.clientWidth + "px";
        $scanLine.style.left = $preview.offsetLeft + "px";
      }
      $preview.style.display = "block";
    };
    $preview.src = e.target.result;

    // 상태 리셋
    $result.textContent = "";
    $resultText.innerHTML = "";
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
    } else {
      $correctionForm.style.display = "none";
    }
  });
}

// =========================
// 토스트 메시지 (비교 기능용)
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
// 이미지 크롭 기능 (Cropper.js) — 자동 적용 버전
// =========================

if ($cropBtn) {
  $cropBtn.addEventListener("click", () => {
    if (!$preview || !$preview.src) {
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
            $file._cameraBlob = blob;
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
// 초기 상태로 완전 리셋 (새로 분석하기)
// =========================
function goToInitialState() {
  if ($file) {
    $file.value = "";          // change 이벤트 다시 활성화
    $file._cameraBlob = null;  // 카메라 블롭도 제거
  }
  
  // 프리뷰
  if ($preview) {
    $preview.src = "";
    $preview.style.display = "none";
  }
  if ($previewWrapper) {
    $previewWrapper.classList.remove("has-image");
    // 스캔라인 위치는 다음 이미지에서 다시 세팅
  }

  // 결과 관련
  if ($result) $result.innerHTML = "";
  if ($container) $container.innerHTML = "";
  if ($resultText) $resultText.innerHTML = "";

  // 박스/버튼/피드백
  if ($resultBox) $resultBox.classList.remove("active");
  if ($actionButtons) {
    $actionButtons.style.display = "none";
    $actionButtons.classList.remove("show");
  }
  if ($feedbackSection) $feedbackSection.style.display = "none";
  if ($correctionForm) $correctionForm.style.display = "none";

  // 쇼핑몰
  if ($shopLinks) {
    $shopLinks.style.display = "none";
    $shopLinks.innerHTML = "";
  }
  if ($shopTitle) $shopTitle.style.display = "none";

  // 상태/버튼
  if ($status) $status.innerText = "";
  if ($cropBtn) $cropBtn.style.display = "none";
  if ($btnCompareStart) $btnCompareStart.style.display = "none";
  if ($btnNew) $btnNew.style.display = "none";
  if ($predictStatus) $predictStatus.innerText = "";

  // 슬라이드 interval 제거
  if (window.__fabric_slide_interval_id) {
    clearInterval(window.__fabric_slide_interval_id);
    window.__fabric_slide_interval_id = null;
  }

  // 업로드/결과 상태도 초기화
  window.uploadedFile = null;
  window.predictedClass = null;
  lastResultSnapshot = null;
}

/*
// =========================
// 비교 기능 (신버전 UI에 맞게 재설계)
// =========================
function renderCompareSlots() {
  if (!$compareSlots) return;
  $compareSlots.innerHTML = "";

  compareHistory.forEach(item => {
    const slot = document.createElement("div");
    slot.className = "compare-slot";
    slot.innerHTML = item.html;
    $compareSlots.appendChild(slot);
  });
}

// 현재 화면 상태를 카드 형태로 스냅샷
function saveCurrentResultSnapshot() {
  const imgSrc = $preview?.src || "";
  const html = `
    <div class="compare-card">
      <div class="compare-image">
        ${imgSrc ? `<img src="${imgSrc}" alt="preview" />` : ""}
      </div>
      <div class="compare-result">
        <div class="raw-bars">
          ${$container ? $container.innerHTML : ""}
        </div>
        <div class="raw-text">
          ${$resultText ? $resultText.innerHTML : ""}
        </div>
      </div>
    </div>
  `;
  return { html, img: imgSrc };
}

// 예측이 끝난 뒤 DOM을 기준으로 스냅샷 업데이트
function updateLastResultSnapshot() {
  lastResultSnapshot = saveCurrentResultSnapshot();

  if (compareMode && compareHistory.length < MAX_COMPARE) {
    const last = compareHistory[compareHistory.length - 1];
    if (!last || last.html !== lastResultSnapshot.html) {
      compareHistory.push(lastResultSnapshot);
      renderCompareSlots();
    }
  }
}

// "비교해보기" 버튼 클릭 → 현재 결과를 비교목록에 추가하고, 비교 모드 ON + 새 분석 준비
if ($btnCompareStart) {
  $btnCompareStart.addEventListener("click", () => {
    const hasResult =
      ($resultText && $resultText.innerHTML.trim()) ||
      ($container && $container.innerHTML.trim());

    if (!hasResult) {
      showMessage("먼저 예측을 완료해주세요!");
      return;
    }

    // 방금 결과 기준으로 스냅샷 생성
    const snap = saveCurrentResultSnapshot();
    const last = compareHistory[compareHistory.length - 1];
    if (compareHistory.length < MAX_COMPARE && (!last || last.html !== snap.html)) {
      compareHistory.push(snap);
    }

    compareMode = true;

    if ($comparePanel) $comparePanel.style.display = "block";
    renderCompareSlots();

    if (compareHistory.length >= MAX_COMPARE) {
      showMessage("최대 4개까지 기록됩니다. 새로 분석하기로 초기화할 수 있어요!");
    }

    // 이제 메인 화면은 새 분석을 위해 초기화
    goToInitialState();
  });
}

// "새로 분석하기" 버튼 → 비교 포함 전체 리셋
if ($btnNew) {
  $btnNew.addEventListener("click", () => {
    compareMode = false;
    compareHistory = [];
    lastResultSnapshot = null;
    if ($comparePanel) $comparePanel.style.display = "none";
    renderCompareSlots();
    goToInitialState();
  });
}*/

//비교해보기
let compareHistory = []; // { html, img } 형태로 저장
let compareActive = false;

/* 예측 결과 UI 업데이트 함수
function renderMainResult(resultHTML) {
  $mainResult.innerHTML = resultHTML;
}*/

// 비교 해보기 버튼 클릭
if ($btnCompareStart) {
  $btnCompareStart.addEventListener("click", () => {
    // 결과가 비어있으면 저장 금지
    const hasResult = ($result && $result.innerHTML.trim()) || ($resultText && $resultText.innerHTML.trim());
    if (!hasResult) {
      showMessage("먼저 예측을 완료해주세요!");
      return;
    }
    // 현재 snapshot 생성
    const snap = saveCurrentResultSnapshot();
    // 같은 내용 중복 저장 방지(간단 체크)
    const last = compareHistory[compareHistory.length - 1];
    if (!last || last.html !== snap.html) {
      compareHistory.push(snap);
    }
    // 패널 열기 + 렌더
    compareActive = true;
    if ($comparePanel) $comparePanel.style.display = "block";
    renderCompareSlots();
    if (compareHistory.length >= MAX_COMPARE) {
      showMessage("최대 4개까지 기록됩니다. 새로 분석하기만 가능해요!");
      return;
    }
    // 초기화
    goToInitialState();
  });
}

// 새로 분석하기 버튼
$btnNew.addEventListener("click", () => {
  compareActive = false;
  compareHistory = [];
  $comparePanel.style.display = "none";
  renderCompareSlots();
  goToInitialState();
});

// 예측 후 버튼 보여주는 역할
function onPredictCompleted(resultHTML) {
    // resultHTML이 넘어오면 (또는 현재 DOM 요소들이 이미 채워져 있으면)
    if (resultHTML) {
      $resultBox.innerHTML = resultHTML;
    } else {
    }
    // show action buttons
    if ($btnCompareStart) $btnCompareStart.style.display = "inline-block";
    if ($btnNew) $btnNew.style.display = "inline-block";
}

//비교 모드 일 때 결과 저장
function addSnapshotIfSpace() {
  if (!compareActive) return;
  const snap = saveCurrentResultSnapshot();
  const last = compareHistory[compareHistory.length - 1];
  if (!last || last.html !== snap.html) {
    compareHistory.push(snap);
    renderCompareSlots();
  }
}
// 비교 슬롯 실제로 그리는 함수
function renderCompareSlots() {
  if (!$compareSlots) return;
  $compareSlots.innerHTML = "";
  compareHistory.forEach((item, idx) => {
    const slot = document.createElement("div");
    slot.className = "compare-slot";
    slot.innerHTML = `
      ${item.html}
    `;
    $compareSlots.appendChild(slot);
  });
}

function saveCurrentResultSnapshot() {
  const imgSrc = $preview?.src || "";
  const html = `
    <div class="compare-card">
      <div class="compare-image"><img src="${imgSrc}" alt="preview" /></div>
      <div class="compare-result">
        <div class="raw-result">${$result.innerHTML}</div>
        <div class="raw-bars">${$container.innerHTML}</div>
        <div class="raw-text">${$resultText.innerHTML}</div>
      </div>
    </div>
  `;
  return { html, img: imgSrc };
}

//초기 상태로 초기화 ++**
function goToInitialState() {
  // 프리뷰 제거
  $preview.src = "";
  $preview.style.display = "none";
  // 결과 박스들 초기화
  $result.innerHTML = "";
  $container.innerHTML = "";
  $resultText.innerHTML = "";
  // 버튼 숨기기
  $btnCompareStart.style.display = "none";
  $btnNew.style.display = "none";
  //쇼핑몰
  $shopLinks.style.display = "none";
  $shopTitle.style.display = "none";
  $status.innerText = "";
  $cropBtn.style.display = "none";
}

// =========================
// 서버 업로드 및 예측 (스트리밍 사용)
// =========================
$btn.addEventListener("click", async () => {
  let uploadFile =
    ($file.files && $file.files[0]) ||
    $file._cameraBlob ||
    window.uploadedFile;

  if (!uploadFile) {
    alert("이미지를 선택하거나 촬영하세요!");
    return;
  }

  // 예측 중 상태 메시지
  if ($predictStatus) $predictStatus.innerText = "예측 중...";

  // 상태 초기화
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

  $loader.style.display = "inline-block";
  if ($scanLine) $scanLine.style.display = "block";
  $result.textContent = "";
  $resultText.innerHTML = "";
  if ($shopLinks) {
    $shopLinks.style.display = "none";
    $shopLinks.innerHTML = "";
  }
  if ($shopTitle) $shopTitle.style.display = "none";
  if ($container) $container.innerHTML = "";
  if ($status) $status.innerText = "";

  // 슬라이드 interval 초기화
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

        // 진행 상태
        if (parsed.status && $status) {
          $status.innerText = parsed.status;
        }

        // 최종 결과
        if (parsed.result) {
          const r = parsed.result;

          // --- 프로그래스바 (신버전 구조 유지 + 애니메이션) ---
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

            $result.textContent = "";
          } else if (parsed.error) {
            $result.textContent = "백엔드 에러: " + parsed.error;
          }

          // --- 상세 정보 + 쇼핑몰 슬라이드(구버전 방식) + 피드백/버튼 ---
          if (r.ko_name) {
            const koName = r.ko_name || "";
            const predictedFabric = r.predicted_fabric || "";
            const wash = r.wash_method || "정보 없음";
            const dry = r.dry_method || "정보 없음";
            const special = r.special_note || "정보 없음";

            $resultText.innerHTML = `
              <h3>${koName} (${predictedFabric})</h3>
              <p>🧺 세탁법: ${wash}</p>
              <p>🌬️ 건조법: ${dry}</p>
              <p>⚠️ 주의사항: ${special}</p>
            `;

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

          // 비교 버튼 활성화
          if ($btnCompareStart) $btnCompareStart.style.display = "inline-block";
          if ($btnNew) $btnNew.style.display = "inline-block";

          // 마지막 결과 스냅샷 갱신
          updateLastResultSnapshot();

          // 예측 완료 상태 문구
          if ($predictStatus) $predictStatus.innerText = "예측 완료!";
        }

        if (parsed.error) {
          $result.textContent = "백엔드 에러: " + parsed.error;
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
    $result.textContent = "에러: " + (e.message || e);
    $resultText.innerText = "에러: " + (e.message || e);
    if ($predictStatus) $predictStatus.innerText = "에러가 발생했습니다.";
  } finally {
    $loader.style.display = "none";
    if ($scanLine) $scanLine.style.display = "none";
  }
});

// =========================
// 카메라 촬영
// =========================
$cameraBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });

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
    if ($previewWrapper) $previewWrapper.appendChild($captureBtn);

    $captureBtn.onclick = async () => {
      $canvas.width = $video.videoWidth;
      $canvas.height = $video.videoHeight;
      $canvas.getContext("2d").drawImage($video, 0, 0);

      const blob = await new Promise(resolve => $canvas.toBlob(resolve, "image/png"));

      stream.getTracks().forEach(track => track.stop());

      showPreview(blob);
      if ($previewWrapper) {
        $previewWrapper.innerHTML = "";
        $previewWrapper.appendChild($preview);
        if ($scanLine) $previewWrapper.appendChild($scanLine);
      }

      $file._cameraBlob = blob;
      window.uploadedFile = blob;
    };
  } catch (err) {
    alert("카메라를 사용할 수 없습니다: " + err.message);
  }
});

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
// ⭐ 방명록 서버 API 연결 ⭐
// =========================
const API_guestbook = "https://backend-6i2t.onrender.com/guestbook";

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
const $submitCorrection = document.getElementById("submitCorrection");
const $correctLabel = document.getElementById("correctLabel");

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
