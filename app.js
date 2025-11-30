const API = "https://backend-6i2t.onrender.com/predict";
const API_STREAM = "https://backend-6i2t.onrender.com/predict_stream";

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
let cropper;
let $cropBtn = document.createElement("button");

const $mainResult = document.getElementById("mainResult");
const $comparePanel = document.getElementById("comparePanel");
const $compareSlots = document.getElementById("compareSlots");
const $btnCompareStart = document.getElementById("btnCompareStart");
const $btnNew = document.getElementById("btnNew");
const $analysis = document.querySelector(".analysis-row");

$btnCompareStart.style.display = "none";
$btnNew.style.display = "none";

const MAX_COMPARE = 4;

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

$file.addEventListener("change", () => {
  if ($file.files.length > 0) {
    $shopTitle.style.display = "none";
    showPreview($file.files[0]);
  }
});

//이미지 미리보기 + 사용자 드래그 크롭
function showPreview(fileOrBlob) {
  const reader = new FileReader();
  reader.onload = e => {
    $preview.src = e.target.result;

    $result.textContent = ""; //리셋 부분**
    $resultText.innerHTML = "";
    $shopLinks.style.display = "none";
    $shopTitle.style.display = "none";
    $container.innerHTML = "";
    $status.innerText = "";

    // Cropper 버튼 초기화
    if (!$cropBtn.parentNode) {
      $cropBtn.textContent = "이미지 자르기";
      $cropBtn.className = "predict-btn";
      //$previewWrapper.appendChild($cropBtn);
      $analysis.appendChild($cropBtn);

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
        $previewWrapper.appendChild($confirmBtn);
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
    $cropBtn.style.display = "inline-block";
  };
  reader.readAsDataURL(fileOrBlob);
}

function showOverlay() {
  document.getElementById('accessibilityOverlay').style.display = 'flex';
}
function closeOverlay() {
  document.getElementById('accessibilityOverlay').style.display = 'none';
}

//let serverChecked = false; // 서버 확인 한 번만 할 플래그

// 버튼 클릭 + 슬라이드 (수정본)
$btn.addEventListener("click", async () => {
  let uploadFile = $file.files?.[0] || $file._cameraBlob;
  if (!uploadFile) {
    alert("이미지를 선택하거나 촬영하세요!");
    return;
  }

  const fd = new FormData();
  fd.append("file", uploadFile);
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
    const res = await fetch(API_STREAM, { method: "POST", body: fd });

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
                $container.querySelectorAll(".progressBars").forEach(($container) => {
                  const percent = bar.dataset.percent;
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

            // 브랜드별 이미지 배열
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
    $btnCompareStart.style.display = "inline-block";
    $btnNew.style.display = "inline-block";
  }
});

let captureBtnRegistered = false; // 캡처 버튼 이벤트 한 번만

// 카메라 촬영
$cameraBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });

    $result.textContent = ""; //리셋 부분 **
    $resultText.innerHTML = "";
    $shopLinks.style.display = "none";
    $shopTitle.style.display = "none";
    $container.innerHTML = "";
    $status.innerText = "";

    $video.srcObject = stream;
    $video.autoplay = true;
    $video.playsInline = true;
    $video.width = 300; $video.height = 200;

    $previewWrapper.innerHTML = ""; $previewWrapper.appendChild($video);

    await new Promise(resolve => $video.onloadedmetadata = () => { $video.play(); resolve(); });

    $captureBtn.className = "capture-circle";
    $previewWrapper.appendChild($captureBtn); //

    //한 번만
    if (!captureBtnRegistered) {
      captureBtnRegistered = true;

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
    }
  } catch (err) {
    alert("카메라를 사용할 수 없습니다: "+err.message);
 }
});

//토스트창 호출
function showMessage(msg, duration = 2000) {
  const box = document.getElementById("message-box");

  box.textContent = msg;
  box.classList.add("show");

  // 기존 타이머 제거 (겹치는 메시지 방지)
  if (box._hideTimer) clearTimeout(box._hideTimer);

  box._hideTimer = setTimeout(() => {
    box.classList.remove("show");
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

//비교해보기
let compareHistory = []; // { html, img } 형태로 저장
let compareActive = false;

// 예측 결과 UI 업데이트 함수
function renderMainResult(resultHTML) {
  $mainResult.innerHTML = resultHTML;
}

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
      $mainResultBox.innerHTML = resultHTML;
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


