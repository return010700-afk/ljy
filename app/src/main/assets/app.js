/**
 * 스마트 만능 계산기 & 외화 환전 앱 (Smart Calculator & FX Engine)
 * - 간단 계산, 공학 계산, 실시간 외화 환율(USD, EUR, JPY) 4대 거래유형 계산
 * - 수식 표시, 누적 계산 기록, 개별 휴지통 삭제 기능
 */

(function () {
    'use strict';

    // -------------------------------------------------------------
    // 1. 상태 관리 변수
    // -------------------------------------------------------------
    let currentCategory = 'panel-basic'; // 'panel-basic', 'panel-sci', 'panel-fx'
    let expression = '';                 // 수식 문자열 (수학 기호 유지)
    let displayValue = '0';              // 메인 결과 창 표시 값
    let isEvaluated = false;             // 직전 계산 완료 여부
    let angleMode = 'DEG';               // 'DEG' or 'RAD'
    let historyList = [];                // 계산 기록 목록

    // 환율 관련 상태
    let fxDirection = 'KRW_TO_CURR';    // 'KRW_TO_CURR' (원화 -> 외화) or 'CURR_TO_KRW'
    let selectedCurrency = 'USD';        // 'USD', 'EUR', 'JPY'
    let selectedFxMode = 'cash-buy';     // 'cash-buy', 'cash-sell', 'send', 'receive'

    // 기본 매매기준율 (오프라인 지원용 고시환율 & 실시간 갱신)
    const baseRates = {
        USD: 1385.50,
        EUR: 1482.30,
        JPY: 9.152   // 1엔당 원화 (100엔당 915.20원)
    };

    // 거래 유형별 수수료 스프레드 (은행 실무 기준 표준 스프레드)
    const spreads = {
        'cash-buy': 0.0175,   // 현금 살 때 (+1.75%)
        'cash-sell': -0.0175, // 현금 팔 때 (-1.75%)
        'send': 0.0098,       // 송금 보낼 때 (+0.98%)
        'receive': -0.0098    // 송금 받을 때 (-0.98%)
    };

    const modeLabels = {
        'cash-buy': '현금 살 때 (스프레드 1.75%)',
        'cash-sell': '현금 팔 때 (스프레드 1.75%)',
        'send': '송금 보낼 때 (수수료 우대)',
        'receive': '송금 받을 때 (수수료 우대)'
    };

    // -------------------------------------------------------------
    // 2. DOM 요소 캐싱
    // -------------------------------------------------------------
    const exprDisplay = document.getElementById('expr-display');
    const resDisplay = document.getElementById('res-display');
    const calcModeIndicator = document.getElementById('calc-mode-indicator');
    const sciAngleMode = document.getElementById('sci-angle-mode');
    const historyBadge = document.getElementById('history-badge');
    const modalHistoryCount = document.getElementById('modal-history-count');
    const historyListView = document.getElementById('history-list-view');
    const historyModal = document.getElementById('history-modal');
    const toastContainer = document.getElementById('toast-container');

    // 환율 DOM
    const fxAmountInput = document.getElementById('fx-amount-input');
    const fxSourceLabel = document.getElementById('fx-source-label');
    const fxSourceCode = document.getElementById('fx-source-code');
    const currentRateInfo = document.getElementById('current-rate-info');
    const fxTargetAmount = document.getElementById('fx-target-amount');
    const fxTargetSymbol = document.getElementById('fx-target-symbol');
    const fxBadgeMode = document.getElementById('fx-badge-mode');
    const fxDetailText = document.getElementById('fx-detail-text');
    const metricBaseRate = document.getElementById('metric-base-rate');
    const metricAppliedRate = document.getElementById('metric-applied-rate');
    const metricUnitInfo = document.getElementById('metric-unit-info');

    // -------------------------------------------------------------
    // 3. 초기화 (Init)
    // -------------------------------------------------------------
    function init() {
        loadHistoryFromStorage();
        setupNavigation();
        setupKeypads();
        setupHistoryModal();
        setupFxEvents();
        fetchRealtimeRates();
        updateDisplay();
        calculateFx();
    }

    // -------------------------------------------------------------
    // 4. 카테고리 탭 네비게이션 (간단 계산 / 공학 계산 / 환율 계산)
    // -------------------------------------------------------------
    function setupNavigation() {
        const catTabs = document.querySelectorAll('.cat-tab');
        const calcDisplaySection = document.getElementById('calc-display-section');

        catTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                catTabs.forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');

                const targetPanelId = tab.dataset.target;
                currentCategory = targetPanelId;

                // 패널 가시성 제어
                document.querySelectorAll('.category-panel').forEach(p => p.classList.remove('active'));
                const activePanel = document.getElementById(targetPanelId);
                if (activePanel) activePanel.classList.add('active');

                // 공용 디스플레이 헤더 업데이트
                if (targetPanelId === 'panel-basic') {
                    calcDisplaySection.style.display = 'flex';
                    calcModeIndicator.textContent = '간단 계산';
                    sciAngleMode.style.display = 'none';
                } else if (targetPanelId === 'panel-sci') {
                    calcDisplaySection.style.display = 'flex';
                    calcModeIndicator.textContent = '공학 계산';
                    sciAngleMode.style.display = 'inline-block';
                } else if (targetPanelId === 'panel-fx') {
                    calcDisplaySection.style.display = 'none'; // 환율 계산기는 전용 결과 카드를 사용
                }
            });
        });

        // DEG/RAD 토글
        sciAngleMode.addEventListener('click', () => {
            angleMode = angleMode === 'DEG' ? 'RAD' : 'DEG';
            sciAngleMode.textContent = angleMode;
            showToast(`각도 모드: ${angleMode}`);
        });
    }

    // -------------------------------------------------------------
    // 5. 키패드 이벤트 및 계산 로직
    // -------------------------------------------------------------
    function setupKeypads() {
        document.querySelectorAll('.key').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const val = btn.dataset.val;
                const fn = btn.dataset.fn;

                handleKeyInput(action, val, fn);
            });
        });
    }

    function handleKeyInput(action, val, fn) {
        if (action === 'all-clear') {
            expression = '';
            displayValue = '0';
            isEvaluated = false;
        } else if (action === 'clear-entry') {
            displayValue = '0';
        } else if (action === 'backspace') {
            if (isEvaluated) {
                expression = '';
                displayValue = '0';
                isEvaluated = false;
            } else if (displayValue.length > 1) {
                displayValue = displayValue.slice(0, -1);
            } else {
                displayValue = '0';
            }
        } else if (action === 'op') {
            handleOperator(val);
        } else if (action === 'calculate') {
            evaluateExpression();
        } else if (action === 'plus-minus') {
            if (displayValue !== '0') {
                if (displayValue.startsWith('-')) {
                    displayValue = displayValue.substring(1);
                } else {
                    displayValue = '-' + displayValue;
                }
            }
        } else if (action === 'sci-fn') {
            handleScientificFunction(fn);
        } else if (action === 'sci-const') {
            handleScientificConstant(val);
        } else if (action === 'paren-open') {
            if (displayValue === '0' || isEvaluated) {
                expression = '(';
                displayValue = '0';
                isEvaluated = false;
            } else {
                expression += displayValue + ' × (';
                displayValue = '0';
            }
        } else if (action === 'paren-close') {
            expression += displayValue + ')';
            displayValue = '0';
        } else {
            // 숫자 및 소수점
            handleNumber(val);
        }

        updateDisplay();
    }

    function handleNumber(num) {
        if (isEvaluated) {
            expression = '';
            displayValue = (num === '.') ? '0.' : num;
            isEvaluated = false;
            return;
        }

        if (num === '.') {
            if (!displayValue.includes('.')) {
                displayValue += '.';
            }
        } else {
            if (displayValue === '0') {
                displayValue = num;
            } else {
                displayValue += num;
            }
        }
    }

    function handleOperator(op) {
        if (isEvaluated) {
            expression = displayValue + ' ' + op + ' ';
            displayValue = '0';
            isEvaluated = false;
            return;
        }

        if (displayValue !== '0' || expression === '') {
            expression += displayValue + ' ' + op + ' ';
            displayValue = '0';
        } else if (expression.length > 0) {
            // 연산자 교체
            expression = expression.trim().replace(/[+\−×÷%^]$/, op) + ' ';
        }
    }

    function handleScientificConstant(c) {
        if (c === 'π') {
            displayValue = String(Math.PI);
        } else if (c === 'e') {
            displayValue = String(Math.E);
        }
        isEvaluated = false;
    }

    function handleScientificFunction(fn) {
        const x = parseFloat(displayValue) || 0;
        let res = 0;

        switch (fn) {
            case 'sqrt':
                if (x < 0) {
                    showToast('음수의 제곱근은 계산할 수 없습니다.');
                    return;
                }
                res = Math.sqrt(x);
                expression = `√(${displayValue})`;
                break;
            case 'fraction': // 분수 (1/x)
                if (x === 0) {
                    showToast('0으로 나눌 수 없습니다.');
                    return;
                }
                res = 1 / x;
                expression = `1/(${displayValue})`;
                break;
            case 'sqr': // x²
                res = Math.pow(x, 2);
                expression = `(${displayValue})²`;
                break;
            case 'sin':
                const angleSin = angleMode === 'DEG' ? (x * Math.PI) / 180 : x;
                res = Math.sin(angleSin);
                expression = `sin(${displayValue})`;
                break;
            case 'cos':
                const angleCos = angleMode === 'DEG' ? (x * Math.PI) / 180 : x;
                res = Math.cos(angleCos);
                expression = `cos(${displayValue})`;
                break;
            case 'tan':
                const angleTan = angleMode === 'DEG' ? (x * Math.PI) / 180 : x;
                res = Math.tan(angleTan);
                expression = `tan(${displayValue})`;
                break;
            case 'log': // 상용로그
                if (x <= 0) {
                    showToast('로그의 진수는 0보다 커야 합니다.');
                    return;
                }
                res = Math.log10(x);
                expression = `log(${displayValue})`;
                break;
            case 'ln': // 자연로그
                if (x <= 0) {
                    showToast('로그의 진수는 0보다 커야 합니다.');
                    return;
                }
                res = Math.log(x);
                expression = `ln(${displayValue})`;
                break;
            case 'fact': // n!
                if (x < 0 || !Number.isInteger(x) || x > 170) {
                    showToast('팩토리얼은 0 이상의 170 이하 정수만 가능합니다.');
                    return;
                }
                res = factorial(x);
                expression = `${displayValue}!`;
                break;
        }

        // 부동소수점 오차 정밀도 보정
        res = Math.round(res * 1e12) / 1e12;
        displayValue = String(res);
        isEvaluated = true;

        // 히스토리에 수식과 결과 추가
        addHistory(expression, displayValue);
    }

    function factorial(n) {
        if (n === 0 || n === 1) return 1;
        let r = 1;
        for (let i = 2; i <= n; i++) r *= i;
        return r;
    }

    // -------------------------------------------------------------
    // 수식 계산 (Evaluation)
    // -------------------------------------------------------------
    function evaluateExpression() {
        if (isEvaluated) return;

        let fullExpr = expression;
        if (displayValue !== '0' || fullExpr === '') {
            fullExpr += displayValue;
        }

        fullExpr = fullExpr.trim();
        if (!fullExpr) return;

        // 수학 기호 치환
        let sanitized = fullExpr
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/−/g, '-')
            .replace(/\^/g, '**');

        try {
            // Function을 통한 안전한 수학 계산
            const result = Function(`'use strict'; return (${sanitized})`)();

            if (!isFinite(result) || isNaN(result)) {
                displayValue = '오류';
                showToast('계산할 수 없는 수식입니다.');
            } else {
                const rounded = Math.round(result * 1e12) / 1e12;
                displayValue = String(rounded);
                isEvaluated = true;

                // 계산 기록(히스토리)에 추가
                addHistory(fullExpr, displayValue);
            }
        } catch (e) {
            displayValue = '수식 오류';
            showToast('수식이 올바르지 않습니다.');
        }
    }

    function updateDisplay() {
        exprDisplay.textContent = expression;
        resDisplay.textContent = formatNumberString(displayValue);
    }

    function formatNumberString(val) {
        if (val === '오류' || val === '수식 오류' || isNaN(Number(val))) {
            return val;
        }
        const parts = val.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }

    // -------------------------------------------------------------
    // 6. 계산 기록 (History) - 추가 누적 & 선택적 개별 휴지통 삭제
    // -------------------------------------------------------------
    function addHistory(expr, result) {
        const item = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
            expression: expr,
            result: result,
            time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        };

        // 최신 기록이 상단에 오도록 추가
        historyList.unshift(item);
        if (historyList.length > 50) historyList.pop(); // 최대 50개 유지

        saveHistoryToStorage();
        renderHistoryList();
    }

    function renderHistoryList() {
        historyBadge.textContent = historyList.length;
        modalHistoryCount.textContent = historyList.length;
        historyBadge.style.display = historyList.length > 0 ? 'inline-block' : 'none';

        if (historyList.length === 0) {
            historyListView.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-folder-open"></i>
                    <p>아직 계산 기록이 없습니다.<br>새로운 계산을 수행하면 여기에 추가됩니다.</p>
                </div>
            `;
            return;
        }

        historyListView.innerHTML = '';
        historyList.forEach(item => {
            const card = document.createElement('div');
            card.className = 'history-item';
            card.innerHTML = `
                <div class="history-content" title="이 계산 불러오기">
                    <div class="history-expr-text">${escapeHtml(item.expression)} =</div>
                    <div class="history-res-text">${formatNumberString(item.result)}</div>
                </div>
                <button class="btn-delete-item" title="이 기록 삭제" aria-label="기록 삭제" data-id="${item.id}">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;

            // 기록 클릭 시 계산기로 불러오기
            card.querySelector('.history-content').addEventListener('click', () => {
                expression = item.expression + ' = ';
                displayValue = item.result;
                isEvaluated = true;
                updateDisplay();
                closeHistoryModal();
                showToast('계산 기록을 불러왔습니다.');
            });

            // 개별 휴지통 아이콘 클릭 시 선택적 삭제
            card.querySelector('.btn-delete-item').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteHistoryItem(item.id);
            });

            historyListView.appendChild(card);
        });
    }

    function deleteHistoryItem(id) {
        historyList = historyList.filter(item => item.id !== id);
        saveHistoryToStorage();
        renderHistoryList();
        showToast('선택한 기록이 삭제되었습니다.');
    }

    function clearAllHistory() {
        if (historyList.length === 0) return;
        historyList = [];
        saveHistoryToStorage();
        renderHistoryList();
        showToast('모든 계산 기록이 삭제되었습니다.');
    }

    function saveHistoryToStorage() {
        try {
            localStorage.setItem('smart_calc_history_v2', JSON.stringify(historyList));
        } catch (e) {
            console.error('LocalStorage save error:', e);
        }
    }

    function loadHistoryFromStorage() {
        try {
            const raw = localStorage.getItem('smart_calc_history_v2');
            if (raw) {
                historyList = JSON.parse(raw);
            }
        } catch (e) {
            historyList = [];
        }
        renderHistoryList();
    }

    function setupHistoryModal() {
        const btnOpen = document.getElementById('btn-open-history');
        const btnClose = document.getElementById('btn-close-modal');
        const btnClearAll = document.getElementById('btn-clear-all-history');

        btnOpen.addEventListener('click', openHistoryModal);
        btnClose.addEventListener('click', closeHistoryModal);
        btnClearAll.addEventListener('click', clearAllHistory);

        historyModal.addEventListener('click', (e) => {
            if (e.target === historyModal) {
                closeHistoryModal();
            }
        });
    }

    function openHistoryModal() {
        historyModal.classList.add('open');
    }

    function closeHistoryModal() {
        historyModal.classList.remove('open');
    }

    // -------------------------------------------------------------
    // 7. 실시간 외화 환율 계산기 로직 (USD, EUR, JPY)
    // -------------------------------------------------------------
    function setupFxEvents() {
        // 거래 유형 모드 버튼 (현금 살때/팔때, 송금 보낼때/받을때)
        document.querySelectorAll('.fx-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.fx-mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedFxMode = btn.dataset.mode;
                calculateFx();
            });
        });

        // 외화 3대 통화 칩 (USD, EUR, JPY)
        document.querySelectorAll('.curr-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.curr-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                selectedCurrency = pill.dataset.curr;
                calculateFx();
            });
        });

        // 환전 금액 입력
        fxAmountInput.addEventListener('input', calculateFx);

        // 통화 스왑 버튼 (원화 -> 외화 <-> 외화 -> 원화)
        document.getElementById('btn-fx-swap').addEventListener('click', () => {
            fxDirection = fxDirection === 'KRW_TO_CURR' ? 'CURR_TO_KRW' : 'KRW_TO_CURR';

            if (fxDirection === 'KRW_TO_CURR') {
                fxSourceLabel.textContent = '원화 (KRW) 입력';
                fxSourceCode.textContent = 'KRW';
            } else {
                fxSourceLabel.textContent = `외화 (${selectedCurrency}) 입력`;
                fxSourceCode.textContent = selectedCurrency;
            }
            calculateFx();
        });
    }

    function calculateFx() {
        const inputAmount = parseFloat(fxAmountInput.value) || 0;
        const baseRate = baseRates[selectedCurrency] || 1385.50;
        const spreadRatio = spreads[selectedFxMode] || 0.0175;

        // 적용 거래 환율 (1 외화당 원화)
        const appliedRate = baseRate * (1 + spreadRatio);

        let finalResult = 0;
        let symbolText = '';
        let detailString = '';

        if (fxDirection === 'KRW_TO_CURR') {
            // 원화 -> 외화
            finalResult = appliedRate > 0 ? inputAmount / appliedRate : 0;
            symbolText = selectedCurrency;

            // 소수점 처리: 달러/유로는 소수점 2자리, 엔화는 정수 또는 소수점 2자리
            finalResult = selectedCurrency === 'JPY' ? Math.round(finalResult) : Math.round(finalResult * 100) / 100;

            detailString = `적용 환율: 1 ${selectedCurrency} = ${formatNumber(appliedRate.toFixed(2))} KRW`;
        } else {
            // 외화 -> 원화
            finalResult = Math.round(inputAmount * appliedRate);
            symbolText = 'KRW (원)';
            detailString = `적용 환율: 1 ${selectedCurrency} = ${formatNumber(appliedRate.toFixed(2))} KRW`;
        }

        // 결과 DOM 반영
        fxTargetAmount.textContent = formatNumber(finalResult);
        fxTargetSymbol.textContent = symbolText;
        fxBadgeMode.textContent = modeLabels[selectedFxMode];
        fxDetailText.textContent = detailString;

        // 메트릭 내역 업데이트
        metricBaseRate.textContent = `${formatNumber(baseRate.toFixed(2))} 원`;
        metricAppliedRate.textContent = `${formatNumber(appliedRate.toFixed(2))} 원`;
        metricUnitInfo.textContent = selectedCurrency === 'JPY' ? '100엔 당 기준' : '1 외화 기준';

        // 상단 실시간 환율 태그
        currentRateInfo.textContent = `1 ${selectedCurrency} = ${formatNumber(appliedRate.toFixed(2))} KRW`;
    }

    // -------------------------------------------------------------
    // 8. 실시간 환율 API 연동 (네트워크 연결 시 최신 환율 패치)
    // -------------------------------------------------------------
    async function fetchRealtimeRates() {
        try {
            const res = await fetch('https://open.er-api.com/v6/latest/USD');
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.rates && data.rates.KRW) {
                const usdKrw = data.rates.KRW;
                baseRates.USD = Math.round(usdKrw * 100) / 100;

                if (data.rates.EUR) {
                    baseRates.EUR = Math.round((usdKrw / data.rates.EUR) * 100) / 100;
                }
                if (data.rates.JPY) {
                    // 1엔 당 원화
                    baseRates.JPY = Math.round((usdKrw / data.rates.JPY) * 1000) / 1000;
                }
                calculateFx();
            }
        } catch (e) {
            // 네트워크가 없거나 오프라인일 때는 내장된 기준 고시환율 자동 사용
            console.log('실시간 환율 패치 실패, 내장 기준 환율 사용');
        }
    }

    // -------------------------------------------------------------
    // 유틸리티 함수
    // -------------------------------------------------------------
    function formatNumber(num) {
        if (num === undefined || num === null || isNaN(num)) return '0';
        const parts = String(num).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function showToast(msg) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 2200);
    }

    // 앱 기동
    document.addEventListener('DOMContentLoaded', init);
})();
