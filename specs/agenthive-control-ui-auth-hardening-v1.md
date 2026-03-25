---
status: implemented
last-verified: "2026-03-25"
---

# AgentHive Control UI Auth Hardening v1

Date: 2026-03-11
Status: draft-for-execution

## 1. Problem

AgentHive의 오픈소스 운영 관점에서 Control UI 연결 문제는 아직 사용자 경험이 거칠다.

현재 로컬 운영 로그에는 아래 노이즈가 반복된다.
- `unauthorized: gateway token mismatch`
- 브라우저 탭이 잘못된 토큰을 유지한 채 반복 재연결
- 운영자는 "왜 안 붙는지"보다 "어디서 토큰을 다시 넣어야 하는지"를 먼저 알아야 함

즉, 현재 문제는 단순 인증 실패가 아니라 **토큰 회전/갱신/복구 UX가 제품 레벨에서 충분히 명시되지 않았다는 것**이다.

## 2. Current Evidence

### Runtime evidence
- `logs/gateway.err.log`
  - Control UI / webchat 브라우저 세션이 `token_mismatch`로 반복 거절됨
  - 에러 메시지 힌트는 존재하지만 운영자가 바로 복구 루트로 이동하는 데는 부족함

### Upstream signal
- 글로벌 OpenClaw changelog에는 이미 다음 계열 이슈들이 반복적으로 등장한다.
  - Control UI auth token separation
  - reconnect hardening
  - auth error reporting
  - gateway token mismatch guidance

이 말은 이 영역이 실제 사용자 pain point이며, AgentHive OSS로 공개할 때도 다시 맞닥뜨릴 가능성이 높다는 뜻이다.

## 3. Goal

Control UI 인증 문제를 다음 수준으로 끌어올린다.

1. **에러를 정확히 분류**한다.
   - token mismatch
   - password mismatch
   - pairing required
   - origin not allowed
   - device token mismatch

2. **복구 경로를 한 화면/한 문서에서 제공**한다.
   - dashboard URL 재발급
   - Control UI settings 재입력
   - secure context / origin 확인
   - device pairing 재실행

3. **토큰 회전 후 stale tab 재연결 폭주를 줄인다.**
   - 오래된 토큰으로 반복 재연결하는 탭은 조용히 retry만 하지 말고 명시적 안내로 전환

## 4. Desired Product Contract

### 4-1. Single source of truth
Control UI 인증의 source of truth는 아래 둘 중 하나여야 한다.
- tokenized dashboard URL
- Control UI settings에 저장된 현재 gateway token

둘이 어긋나면 브라우저는 스스로 추측하지 말고 **명확히 mismatch 상태**로 들어가야 한다.

### 4-2. Error-to-action mapping
각 에러는 즉시 다음 액션으로 연결돼야 한다.

- `token_mismatch`
  - 현재 gateway token 다시 붙여넣기
  - tokenized dashboard URL 재오픈
- `password_mismatch`
  - Control UI settings에서 password 재입력
- `pairing_required`
  - pairing 명령 / 모바일 링크 / 승인 경로 표시
- `origin_not_allowed`
  - allowedOrigins 설정 위치와 현재 origin 표시
- `device_token_mismatch`
  - device token 재발급 또는 브라우저 local state 초기화 안내

## 5. UX Hardening Rules

### Rule 1. Silent retry보다 explicit recovery 우선
복구 불가능한 인증 오류에서는 재시도보다 **명시적 사용자 액션 요구**가 먼저 나와야 한다.

### Rule 2. Current vs stale token provenance 표시
사용자가 넣은 값이 현재 token인지, stale cached token인지 provenance를 보여줘야 한다.

### Rule 3. Copy-paste ready operator output
운영자/사용자가 바로 붙여넣어 쓸 수 있는 문구를 제공한다.
- 현재 접속 URL
- 필요한 설정 위치
- 다음 명령 또는 재오픈 링크

### Rule 4. Rotation-safe browser behavior
토큰이 바뀌면 브라우저는 이전 토큰으로 무한 재연결하지 말고 mismatch 화면으로 멈춰야 한다.

## 6. Scope for AgentHive Core

이 카드의 범위는 구현이 아니라 **AgentHive가 앞으로 제품/대시보드 hardening 카드를 어떻게 쪼갤지 정하는 것**이다.

### In scope
- 문제 정의
- 상태 분류
- 에러→액션 매핑
- 후속 implementation 카드 분해

### Out of scope
- 실제 OpenClaw upstream 코드 패치
- 브라우저 저장소 마이그레이션 구현
- pairing/auth backend 변경

## 7. Next Implementation Cards

### TASK-007: Control UI token mismatch UX trace
- 목표: 브라우저에서 어떤 stale state가 재연결 루프를 만드는지 추적
- 산출물: state diagram + repro steps

### TASK-008: Control UI auth recovery panel spec
- 목표: mismatch/pairing/origin 오류를 하나의 recovery panel로 통합
- 산출물: panel states + copy deck + action mapping

### TASK-009: Operator auth diagnostics pack
- 목표: token/origin/pairing 상태를 한 번에 보는 진단 패널 또는 pack 정의
- 산출물: operator diagnostics surface spec

## 8. Acceptance Criteria

이 문서는 아래를 만족하면 완료다.
- Control UI auth 문제를 제품 hardening 이슈로 재정의한다.
- token mismatch를 포함한 주요 auth 실패 유형을 분류한다.
- 각 실패 유형의 recovery action을 명시한다.
- 다음 implementation cards가 2개 이상 구체적으로 정의된다.

## 9. One-line Summary

AgentHive OSS 고도화의 다음 단계는 "기능을 더 붙이는 것"보다 **Control UI 인증 실패를 즉시 복구 가능한 운영 UX로 바꾸는 것**이다.
