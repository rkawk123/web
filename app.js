//모바일
const API = "https://backend-6i2t.onrender.com/predict";
const API_STREAM = "https://backend-6i2t.onrender.com/predict_stream";
const API_BASE = "https://backend-6i2t.onrender.com";

const $dropArea = document.getElementById("drop-area");
const $file = document.getElementById("file");
const $preview = document.getElementById("preview");
const $btn = document.getElementById("btn");
const $result = document.getElementById("result");
const $resultText = document.getElementById("resultText");
const $loader = document.getElementById("loading");
const $scanLine = document.querySelector(".scan-line");
const $cameraBtn = document.getElementById("camera-btn");
const $previewWrapper = document.querySelector(".preview-wrapper");
const $captureBtn = document.createElement("div");
const $video = document.createElement("video");
const $canvas = document.createElement("canvas");
const $shopTitle = document.getElementById("shopTitle");
const $shopLinks = document.getElementById("shopLinks"); //링크 요소 가져오기
const $status = document.getElementById("status"); //
const $btnAddCompare = document.getElementById("btn-add-compare"); //비교 버튼
const $btnCompare = document.getElementById("btn-compare");
const $toggle = document.getElementById("modeToggle");      // 실제 체크박스
const $tooltip = document.getElementById("tooltip");        // 툴팁
const $toggleWrapper = document.querySelector(".toggle-switch"); // 스위치 wrapper
const $container = document.getElementById("progressBarsContainer");
const $box = document.getElementById("message-box"); //토스트창
let cropper;
const $analysis = document.querySelector(".analysis-row"); //

const $resultBox = document.getElementById("result-box");
const $comparePanel = document.getElementById("comparePanel");
const $compareSlots = document.getElementById("compareSlots");
const $btnCompareStart = document.getElementById("btnCompareStart");
const $btnNew = document.getElementById("btnNew");

$btnCompareStart.style.display = "none";
$btnNew.style.display = "none";

const MAX_COMPARE = 4;

let captureBtnRegistered = false;
let currentController = null;

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
    $shopTitle.style.display = "none";
    showPreview(files[0]);
  }
});

//토스트창 호출
function showMessage(msg, duration = 2000) {
  $box.textContent = msg;
  $box.classList.add("show");

  // 기존 타이머 제거 (겹치는 메시지 방지)
  if ($box._hideTimer) clearTimeout($box._hideTimer);

  $box._hideTimer = setTimeout(() => {
    $box.classList.remove("show");
  }, duration);
}

// 현재 상태에 맞게 툴팁 내용 업데이트 함수
function updateTooltipText() {
  if ($toggle.checked) {
    $tooltip.textContent = "데모 모드입니다!";
  } else {
    $tooltip.textContent = "일반 모드입니다! 직접 체험해보세요!";
  }
}
// hover 시 툴팁 나타나기 + 텍스트 갱신
$toggleWrapper.addEventListener("mouseenter", () => {
  updateTooltipText();
  $tooltip.style.opacity = "1";
});
$toggleWrapper.addEventListener("mouseleave", () => {
  $tooltip.style.opacity = "0";
});
// 체크박스 상태 변경 시 툴팁 텍스트 갱신
$toggle.addEventListener("change", updateTooltipText);

//비교 해보기
let compareHistory = []; // { html, img } 형태로 저장
let compareActive = false;

// 예측 결과 UI 업데이트 함수
function renderMainResult(resultHTML) {
  $resultBox.innerHTML = resultHTML;
}

// 백업로드 버튼 핸들러 함수
function handleCompareStart() {
  const hasResult =
    ($result && $result.textContent.trim()) ||
    ($resultText && $resultText.innerHTML.trim());

  // 결과가 없을 때
  if (!hasResult) {
    showMessage("먼저 예측을 완료해주세요!");
    return;
  }

  // snapshot 저장
  const snap = saveCurrentResultSnapshot();
  const last = compareHistory[compareHistory.length - 1];

  if (!last || last.html !== snap.html) {
    compareHistory.push(snap);
  }

  // 비교 패널 열기
  compareActive = true;
  if ($comparePanel) $comparePanel.style.display = "block";

  renderCompareSlots();

  if (compareHistory.length >= MAX_COMPARE) {
    showMessage("최대 4개까지 기록됩니다. 새로 분석하기만 가능해요!");
    return;
  }

  // 초기화
  goToInitialState();
}

// 백업로그
if ($btnCompareStart) {
  $btnCompareStart.addEventListener("click", handleCompareStart);
}
// 새로고침
if ($btnNew) {
  $btnNew.addEventListener("click", handleNewAnalysis);
}

// 새로고침 버튼 핸들러 함수
function handleNewAnalysis() {
  compareActive = false;
  compareHistory = [];
  $comparePanel.style.display = "none";
  renderCompareSlots();
  goToInitialState();
}

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

//초기 상태로 초기화
function goToInitialState() {
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
  // 프리뷰 제거
  $preview.src = "";
  $preview.style.display = "none";
}

//데모 버전
// 자동 데모 모드 — 토글 스위치 기준
let demoRunning = false;   // 데모 루프 상태
let idleTimer = null;      // 3분 Idle 타이머
let demoFiles = [];        // 데모 이미지 목록

// 랜덤 파일 선택
function pickRandomFile() {
    return demoFiles[Math.floor(Math.random() * demoFiles.length)];
}

//파일 목록 로드
async function loadDemoFiles() {
    const res = await fetch("/demo_files");
    const data = await res.json();
    demoFiles = data.files;
}

// Promise 대기
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 데모 루프
async function startDemoLoop() {
  // 이미 실행 중이면 또 실행하지 않기
  if (demoRunning) return;

  demoRunning = true;

  while (demoRunning) {
    // 랜덤 파일 선택
    const fileName = pickRandomFile();
    if (!fileName) return;
    const blob = await fetch(`/image/${fileName}`).then(r => r.blob());
    //미리보기
    showPreview(blob);
    // 예측 실행
    await runPrediction(blob);
    // 10초 대기
    await wait(10000);
    // 자동 실행
    handleCompareStart();
    //2초
    await wait(2000);
    // 최대 4개 쌓이면 자동 초기화
    if (compareHistory.length >= MAX_COMPARE) {
      handleNewAnalysis();
    }
    // 다음 루프로 자동 진행
  }
}

//끄기
function stopDemoLoop() {
    demoRunning = false;
    // ⭐ 스트림 강제 중단
    if (currentController) {
      currentController.abort();
    }
    handleNewAnalysis();
}

/*강제 초기화
function hardResetCompare() {
  compareActive = false;
  compareHistory = [];
  if ($comparePanel) $comparePanel.style.display = "none";
  renderCompareSlots();
}*/

// 토글 스위치로 데모 모드 제어
$toggle.addEventListener("change", () => {
  if ($toggle.checked) {
    lockUIForDemo();
    startDemoLoop();
  } else {
    stopDemoLoop();
    unlockUI();
    hardResetCompare();
  }
});

//3분 Idle → 자동 데모 ON
function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);

  idleTimer = setTimeout(() => {
    // 자동으로 데모 ON
    $toggle.checked = true;
    lockUIForDemo();
    startDemoLoop();
  }, 3 * 60 * 1000); // 3분
}

function lockUIForDemo() {
  $dropArea.style.pointerEvents = "none";
  $file.disabled = true;
  $cameraBtn.style.display = "none";
  $btn.style.display = "none";
}

function unlockUI() {
  $dropArea.style.pointerEvents = "auto";
  $file.disabled = false;
  $cameraBtn.style.display = "inline-block";
  $btn.style.display = "inline-block";
}

window.onload = async () => {
  
  await loadDemoFiles();
  resetIdleTimer();
};

window.addEventListener("click", resetIdleTimer);
window.addEventListener("mousemove", resetIdleTimer);
window.addEventListener("keydown", resetIdleTimer);

//이미지 변경
function handleFileChange(e) {
  const file = e.target.files?.[0];
  if (!$file.files[0]) return; //file

  $shopTitle.style.display = "none";
  showPreview($file.files[0]);
}

//이미지 변경 핸들러
$file.addEventListener("change", handleFileChange);

//이미지 미리보기 + 사용자 드래그 크롭
function showPreview(fileOrBlob) {
  $preview.style.display = "block";
  const reader = new FileReader();
  reader.onload = e => {
    $preview.src = e.target.result;

    $result.textContent = ""; //리셋 부분**
    $resultText.innerHTML = "";
    $shopLinks.style.display = "none";
    $shopTitle.style.display = "none";
    $container.innerHTML = "";
    $status.innerText = "";

    /* Cropper 버튼 초기화
    if (!$cropBtn.parentNode) {
      $cropBtn.textContent = "이미지 자르기";
      $cropBtn.className = "upload-btn";
      $analysis.appendChild($cropBtn);
      //$previewWrapper.appendChild($cropBtn);

      $cropBtn.addEventListener("click", () => {
        // 기존 Cropper 제거
        if (cropper) cropper.destroy();

        // Cropper 초기화: 사용자가 드래그하여 선택
        cropper = new Cropper($preview, {
          viewMode: 1,
          autoCrop: false,  // 자동 사각형 제거
          background: false,
          modal: true,
          movable: true,
          zoomable: true,
          rotatable: false,
          scalable: false
        });

        // 확인 버튼
        let $confirmBtn = document.createElement("button");
        $confirmBtn.textContent = "확인";
        $confirmBtn.className = "predict-btn";
        $analysis.appendChild($confirmBtn);
        //$previewWapper.appendCHild($confirmBtn);
        $confirmBtn.addEventListener("click", () => {
          if (!cropper) return;
          cropper.getCroppedCanvas().toBlob(blob => {
            const reader2 = new FileReader();
            reader2.onload = e2 => {
              $preview.src = e2.target.result;
              $file._cameraBlob = blob;
              cropper.destroy();
              cropper = null;
              $confirmBtn.remove();
            };
            reader2.readAsDataURL(blob);
          }, "image/png");
        });
      });
    }
    $cropBtn.style.display = "inline-block"; */
  };
  reader.readAsDataURL(fileOrBlob);
}

// 버튼 클릭 핸들러
$btn.addEventListener("click", async () => {
  const uploadFile = $file.files?.[0] || $file._cameraBlob;
  if (!uploadFile) {
    alert("이미지를 선택하거나 촬영하세요!");
    return;
  }
  await runPrediction(uploadFile);
});

//예측 함수
async function runPrediction(uploadFile) {
  //let uploadFile = $file.files?.[0] || $file._cameraBlob;
  // 기존 스트림 중단
  if (currentController) {
    currentController.abort();
  }

  // 새로운 컨트롤러 생성
  currentController = new AbortController();
  document.querySelector("#resultBox")?.classList.remove("active"); //제거 시

  const fd = new FormData();
  fd.append("file", uploadFile);
  fd.append("demo", demoRunning ? "1" : "0");   // 🔥 데모 모드 여부 추가
  $loader.style.display = "inline-block";
  $scanLine.style.display = "block";

  $result.textContent = ""; //리셋 부분 **
  $resultText.innerHTML = "";
  $shopLinks.style.display = "none";
  $shopTitle.style.display = "none";
  $container.innerHTML = "";
  $status.innerText = "";

  // 슬라이드 interval id 저장
  if (!window.__fabric_slide_interval_id) window.__fabric_slide_interval_id = null;

  try {
    const res = await fetch(API_STREAM, { method: "POST", body: fd, signal: currentController.signal });

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

          //예측 결과 표시
            if (r?.predictions?.length) {
              // --- 프로그래스바 생성 ---
              let progressBarsHtml = "";

              r.predictions.forEach((p, i) => {
                const percent = (p.score * 100).toFixed(1);

                progressBarsHtml += `
                  <div class="progress-row">
                    <span class="progress-label">${i + 1}. ${p.label}</span>

                    <div class="progress-wrapper">
                      <div class="progressBars" data-percent="${percent}" style="width:0"></div>
                    </div>

                    <span class="progress-percent">${percent}%</span>
                  </div>
                `;
              });

              $container.innerHTML = progressBarsHtml;

              // 애니메이션 적용
              $container.style.opacity = 0;
              $container.style.transform = "translateY(20px)";
              $container.style.transition = "opacity 0.5s, transform 0.5s";

              setTimeout(() => {
                $container.style.opacity = 1;
                $container.style.transform = "translateY(0)";
                $container.querySelectorAll(".progressBars").forEach(($container) => { //
                  const percent = $container.dataset.percent;
                  $container.style.transition = "width 1.2s cubic-bezier(.42,0,.58,1)";
                  $container.style.width = percent + "%";
                });
              }, 100);

              // 기존 텍스트 영역 초기화
              $result.textContent = "";
            } else if (parsed.error) {
              $result.textContent = "백엔드 에러: " + parsed.error;
            } else {
              $result.textContent = "예측 결과를 받지 못했습니다.";
            }

          // 🔥 예측 성공 → 결과 박스 등장
          document.querySelector("#resultBox")?.classList.add("active");

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

            /* 브랜드별 이미지 배열
            const shopImages = {
              naver: [`./images/naver/${fabric}1.jpg`, `./images/naver/${fabric}2.jpg`],
              musinsa: [`./images/musinsa/${fabric}3.jpg`, `./images/musinsa/${fabric}4.jpg`],
              spao: [`./images/spao/${fabric}5.jpg`, `./images/spao/${fabric}6.jpg`]
            };

            const shopLinksData = [
              { name: "네이버 쇼핑", url: `https://search.shopping.naver.com/search/all?query=${query}`, images: shopImages.naver },
              { name: "무신사", url: `https://www.musinsa.com/search/musinsa/integration?keyword=${query}`, images: shopImages.musinsa },
              { name: "스파오", url: `https://www.spao.com/product/search.html?keyword=${query}`, images: shopImages.spao }
            ];*/

            // 브랜드별 이미지 배열
            const shopImages = {
              naver: [`./images/naver/${fabric}1.jpg`, `./images/naver/${fabric}2.jpg`],
              musinsa: [`./images/musinsa/${fabric}3.jpg`, `./images/musinsa/${fabric}4.jpg`],
              spao: [`./images/spao/${fabric}5.jpg`, `./images/spao/${fabric}6.jpg`]
            };

            // 검색어 수정 & 숨기기 조건
            let spaoQuery = r.ko_name;   // 기본 검색어
            let hideSpao = false;

            // 스판덱스 → 스판 검색어 교체
            if (r.ko_name === "스판덱스") {
              spaoQuery = "스판";
            }

            // 실크 벨벳 → 스파오 숨기기
            if (r.ko_name === "실크 벨벳") {
              hideSpao = true;
            }

            // 🔥 쇼핑몰 리스트 구성
            let shopLinksData = [
              { name: "네이버 쇼핑", url: `https://search.shopping.naver.com/search/all?query=${query}`, images: shopImages.naver },
              { name: "무신사", url: `https://www.musinsa.com/search/musinsa/integration?keyword=${query}`, images: shopImages.musinsa }
            ];

            // 스파오 표시 여부 체크
            if (!hideSpao) {
              shopLinksData.push({ name: "스파오", url: `https://www.spao.com/product/search.html?keyword=${encodeURIComponent(spaoQuery)}`, images: shopImages.spao });
            }

            // 초기 이미지 생성
            $shopLinks.innerHTML = shopLinksData
              .map((shop) => `
                <a href="${shop.url}" target="_blank" class="shop-link">
                  ${shop.images.map((img, i) => `<img src="${img}" alt="${shop.name} 이미지 ${i+1}" class="${i === 0 ? 'active' : ''}">`).join('')}
                </a>
              `).join("");

            $shopLinks.style.display = "flex";
            $shopTitle.style.display = "block";

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
    console.error(e);  // 전체 에러 객체 보기
    $result.textContent = "에러: " + (e.message || e);
    $resultText.innerText = "에러: " + (e.message || e);
  } finally {
    $loader.style.display = "none";
    $scanLine.style.display = "none";
    if (!demoRunning) {
    $btnCompareStart.style.display = "inline-block";
    $btnNew.style.display = "inline-block";
    }
  }
}

// 캡처 버튼 이벤트 등록 (1회만)
function registerCaptureOnce() {
  if (captureBtnRegistered) return;
  captureBtnRegistered = true;

  $captureBtn.addEventListener("click", async () => {
    // 🎥 비디오 프레임 → 캔버스 → Blob 생성
    $canvas.width = $video.videoWidth;
    $canvas.height = $video.videoHeight;
    $canvas.getContext("2d").drawImage($video, 0, 0);

    const blob = await new Promise(resolve =>
      $canvas.toBlob(resolve, "image/png")
    );

    // 스트림 종료
    const stream = $video.srcObject;
    if (stream) stream.getTracks().forEach(track => track.stop());

    // 이미지 미리보기 표시
    showPreview(blob);
    $previewWrapper.innerHTML = "";
    $previewWrapper.appendChild($preview);
    $previewWrapper.appendChild($scanLine);

    // 실제 서버 업로드용 Blob 저장
    $file._cameraBlob = blob;

    // 자동으로 예측 실행 버튼 클릭
    $btn.click();
  });
}

// 카메라 시작 함수
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });

    // UI 리셋
    $result.textContent = "";
    $resultText.innerHTML = "";
    $shopLinks.style.display = "none";
    $shopTitle.style.display = "none";
    $container.innerHTML = "";
    $status.innerText = "";

    // 비디오 세팅
    $video.srcObject = stream;
    $video.autoplay = true;
    $video.playsInline = true;
    $video.width = 300;
    $video.height = 200;

    // video DOM 적용
    $previewWrapper.innerHTML = "";
    $previewWrapper.appendChild($video);

    // 실제 재생될 때까지 기다림
    await new Promise(resolve =>
      $video.onloadedmetadata = () => {
        $video.play();
        resolve();
      }
    );

    // 캡처 버튼 표시
    $captureBtn.className = "capture-circle";
    $previewWrapper.appendChild($captureBtn);

    // 이벤트 1회 등록
    registerCaptureOnce();

  } catch (err) {
    alert("카메라를 사용할 수 없습니다: " + err.message);
  }
}

/* 촬영 버튼 클릭 → startCamera 실행
$cameraBtn.addEventListener("click", startCamera);
*/

//! 이 사이만 고침(모바일 카메라 앱)
// 촬영 버튼 클릭 → startCamera 실행
function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}


function handleCameraClick() {
  if (isMobile()) {
    // 모바일: 카메라 앱 실행
    const mobileInput = document.createElement("input");
    mobileInput.type = "file";
    mobileInput.accept = "image/*";
    mobileInput.capture = "environment";
    mobileInput.style.display = "none";

    mobileInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      $file._cameraBlob = file;

      // 미리보기 박스에 표시
      showPreview(file);
      $previewWrapper.appendChild($preview);
    });

    document.body.appendChild(mobileInput);
    mobileInput.click();
    document.body.removeChild(mobileInput);

  } else {
    // PC: 기존 카메라 장치
    startCamera();
  }
}

// DOMContentLoaded 안에서 등록
document.addEventListener("DOMContentLoaded", () => {
  $cameraBtn.addEventListener("click", handleCameraClick);
});
//! 이 사이만 고침(모바일 카메라 앱)

// 문의 폼 제출 기능
document.addEventListener('DOMContentLoaded', function () {
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const firstName = document.getElementById('firstName').value.trim();
      const lastName = document.getElementById('lastName').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const message = document.getElementById('message').value.trim();

      if (!email || !message) {
        alert("필수 항목을 작성하세요.");
        return;
      }

      // 실제 배포 환경이라면 여기에 서버로 POST 등 구현!
      // 데모는 Console에 출력만
      console.log({
        firstName,
        lastName,
        email,
        phone,
        message
      });

      alert("문의가 성공적으로 제출되었습니다!");

      e.target.reset();
    });
  }
});

