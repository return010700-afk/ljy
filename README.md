# 📱 스마트 만능 계산기 & 외화 환전 안드로이드 앱 (Smart Calculator & FX)

이 프로젝트는 웹 기반 스마트 계산기([https://mmlab2010.github.io/calc/](https://mmlab2010.github.io/calc/))와 앱 내 내장된 오프라인 고성능 웹 엔진을 안드로이드 네이티브 앱 환경으로 구축한 **하이브리드 웹뷰(WebView) 애플리케이션**입니다.

사용자의 컴퓨터에 **Android Studio가 설치되어 있지 않아도**, GitHub Actions를 통해 클라우드에서 자동으로 APK를 빌드하고 즉시 다운로드하여 스마트폰에 설치할 수 있도록 모든 설정이 완비되어 있습니다.

---

## 🌟 1. 앱 핵심 기능 및 구성

### 1-1. 3가지 카테고리 분리 지원
1. **간단 계산 (Basic Calculator)**:
   - 시인성이 뛰어난 크고 선명한 버튼 및 고대비 디스플레이
   - 실제 사칙연산, 백분율(%), 괄호, 백스페이스, 음양 부호(±) 지원
   - **수식 표출**: 계산 식을 한글이 아닌 실제 수학 수식 형태(`150 × 4 + 20`)로 명확히 표출
2. **공학 계산 (Scientific Calculator)**:
   - 제곱근(√x), 분수(1/x), 제곱(x²), 거듭제곱(xʸ), 파이(π), 자연상수(e)
   - 삼각함수(sin, cos, tan - DEG/RAD 지원), 팩토리얼(n!), 로그(log, ln) 등 실제 동작하는 공학 엔진 탑재
3. **환율 계산 (FX Exchange)**:
   - **3대 주요 외화**: **미국 달러 (USD $)**, **유럽 유로 (EUR €)**, **일본 엔화 (JPY ¥ - 100엔 기준 단위 자동 보정)**
   - **4가지 거래 방식**:
     - **현금 살 때 (Cash Buy)**
     - **현금 팔 때 (Cash Sell)**
     - **송금 보낼 때 (Send Transfer)**
     - **송금 받을 때 (Receive Transfer)**
   - 한국 돈(KRW) ↔ 외화 간 **양방향 스왑(⇄) 계산** 지원
   - 최신 실시간 환율 API 연동 + 오프라인 고시환율 자동 백업

### 1-2. 누적 계산 기록 (History) 및 개별 휴지통 삭제
- **시계 아이콘 (⏱️)**: 터치 시 누적된 계산 기록 모달 표시
- **영구 보존**: 계산을 새로 수행해도 이전 기록이 지워지지 않고 계속 누적 추가 (HTML5 LocalStorage)
- **개별 삭제 (휴지통 아이콘 🗑️)**: 각 계산 기록 항목마다 우측에 휴지통 버튼이 제공되어 **선택적으로 특정 기록만 삭제** 가능
- **기록 불러오기**: 과거 기록을 터치하면 해당 수식과 결과가 계산기 화면으로 자동 복원
- **전체 삭제**: 하단 '전체 기록 삭제' 버튼 지원

---

## 🎨 2. 앱 아이콘 디자인

- **밝고 세련된 디자인**: 산뜻한 스카이블루-인디고-바이올렛 그라디언트 배경 위에, 입체감 있는 모던 화이트 계산기 바디와 고화질 디지털 화면(`FX SMART`, `1,385.50`), 그리고 실시간 외화 환전을 상징하는 **황금 동전($) 뱃지** 배치
- **안드로이드 표준 규격 완비**:
  - Android 8.0+ Adaptive Icon (전경/배경 분리)
  - 모든 화면 밀도(`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`) 완벽 대응
  - 512×512 고화질 원본 (`app/src/main/ic_launcher-web.png`)

---

## 🚀 3. GitHub 리포지토리 푸시 & APK 자동 빌드

컴퓨터의 PowerShell에서 아래 명령어를 차례대로 실행하여 GitHub 리포지토리에 푸시합니다:

```powershell
# 1. 파일 추가 및 커밋 확인
git add .
git commit -m "initial commit: WevView Android App"

# 2. main 브랜치 지정 및 원격 저장소 연결 (이미 설정 완료됨)
git branch -M main
git remote add origin https://github.com/return010700-afk/ljy.git

# 3. GitHub로 푸시 (첫 푸시 시 GitHub 로그인 팝업이 나타납니다)
git push -u origin main
```

---

## 📥 4. APK 다운로드 및 스마트폰 설치 방법

1. 푸시 완료 후 GitHub의 저장소 페이지([https://github.com/return010700-afk/ljy](https://github.com/return010700-afk/ljy))로 이동합니다.
2. 상단 메뉴에서 **`Actions`** 탭을 클릭하면 **`Build & Package Android APK`** 워크플로우가 자동으로 실행 중인 것을 확인할 수 있습니다.
3. 약 2~3분 후 빌드가 완료되면(초록색 체크 `✔`), 해당 빌드 실행 결과를 클릭합니다.
4. 결과 화면 맨 하단의 **Artifacts** 섹션에서 바로 설치 가능한 APK를 다운로드할 수 있습니다:
   - **`CalcExchange-Debug-APK`**: 서명 없이 스마트폰에 즉시 설치 가능한 최적의 APK
   - **`CalcExchange-Release-APK`**: 배포용 릴리즈 APK
5. 다운로드한 `.zip` 압축을 해제한 후 스마트폰으로 전송하여 설치하시면 됩니다.
