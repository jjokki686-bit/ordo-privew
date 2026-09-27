# 오르도 iPhone 앱 프로젝트

현재 오르도 화면을 유지한 Capacitor iOS 프로젝트입니다. `web/index.html`은 기존 개선본을 그대로 옮겼고, `npm run build`가 이를 `www/index.html`로 복사합니다. `ios/`는 Xcode에서 열 수 있는 네이티브 프로젝트입니다.

## 현재 준비된 것

- 홈, 캘린더, 채팅, 마이페이지 등 기존 화면과 브라우저 미리보기 기능
- iPhone 세로 화면용 iOS 프로젝트와 오르도 앱 아이콘
- 사진·카메라·현재 위치 사용 이유 문구
- 변경 없이 웹 화면을 앱 자산으로 복사하는 빌드와 일치 검사

## Mac에서 처음 실행할 때

1. Xcode와 Node.js를 설치합니다. Capacitor 8은 Node.js 22 이상과 지원되는 Xcode가 필요합니다.
2. 이 폴더에서 `npm ci`를 실행합니다.
3. `npm run ios:sync`를 실행합니다.
4. `npm run ios:open`으로 Xcode를 열고 개인 개발팀을 지정해 iPhone 또는 시뮬레이터에서 실행합니다.

앱의 임시 번들 ID는 `com.ordo.prototype`입니다. App Store 등록 전 소유한 식별자로 변경하고 Xcode의 Signing을 설정해야 합니다.

Mac이 없다면 이 폴더를 GitHub 저장소의 최상위에 올리고 **Actions → iOS compile check → Run workflow**를 실행할 수 있습니다. 포함된 `.github/workflows/ios-compile.yml`은 GitHub의 macOS 환경에서 서명 없는 iPhone 시뮬레이터 빌드를 검사합니다. 이 결과물은 실제 아이폰에 설치할 수 있는 IPA가 아니며, App Store 제출에도 사용할 수 없습니다.

## 화면 수정 방법

`web/index.html`을 수정하고 `npm run build`, `npm run check`, `npm run ios:sync`를 실행합니다. `www/`와 `ios/App/App/public/`은 생성된 파일이므로 직접 편집하지 않습니다.

## 출시 전에 연결할 기능

현재 일정·친구·채팅 기록은 기기 안의 웹 저장소에 있으며 계정 동기화나 다른 사람과의 실시간 채팅은 아직 없습니다. Apple·Google·카카오·네이버 로그인 버튼도 인증 서버가 연결되지 않은 예시입니다. 실제 서비스에는 계정 서버, 데이터베이스, 실시간 채팅, 계정 삭제 기능과 개인정보 처리 문서가 필요합니다.

아이폰 캘린더 자동 동기화는 EventKit을 호출하는 iOS 네이티브 플러그인 연결이 필요합니다. 현재 가능한 기능은 `.ics` 파일 가져오기·내보내기입니다. 앱이 닫혀 있을 때 일정과 채팅 알림을 받으려면 iOS 알림 연동과 채팅용 푸시 서버가 필요합니다. 현재 주소 자동 변환도 지오코딩 서비스 연결이 필요합니다.

이 프로젝트는 **iOS 앱의 시작 빌드**입니다. Windows에서 Xcode 컴파일과 실제 아이폰 동작은 검증할 수 없으므로 Mac 환경에서 기기 테스트를 완료한 뒤 TestFlight에 올려야 합니다.
