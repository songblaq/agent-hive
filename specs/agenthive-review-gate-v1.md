# AgentHive Review Gate v1

- 작성일: 2026-03-11
- 상태: Draft
- 범위: AgentHive core v1
- 목적: task lifecycle와 별도로 review gate를 제품 레벨의 상태 전이 제어장치로 정의한다.

## 1. 한 줄 정의

Review Gate는 단순한 승인 버튼이 아니라, **이 작업이 현재 상태에서 merge / release / completion으로 진행해도 되는지 판정하는 강제 게이트**다.

## 2. 설계 원칙

### 2-1. task 상태와 gate 상태를 분리한다
Task lifecycle과 review decision은 다른 축이다.

- task lifecycle:
  - `planned`
  - `building`
  - `review`
  - `done`

- review gate lifecycle:
  - `not_required`
  - `pending`
  - `blocked_review`
  - `approved`
  - `waived`

이 둘을 한 상태 필드에 합치면 예외 처리와 audit가 불안정해진다.

### 2-2. gate는 Hub가 강제한다
- Dashboard는 gate 상태를 보여주기만 한다.
- CLI / API / automation / GitHub autopilot 모두 동일한 gate 규칙을 통과해야 한다.
- UI에서만 막는 방식은 허용하지 않는다.

### 2-3. 승인 유효성은 시스템이 재검증한다
`approve`가 기록되었다고 곧바로 유효한 것이 아니다.
다음 조건을 Hub가 재검증해야 한다.
- required evidence 충족
- active block 없음
- actor 권한 유효
- task scope와 decision scope 일치

## 3. 상태 모델

## 3-1. Task lifecycle
- `planned`
- `building`
- `review`
- `done`

전이 규칙:
- `planned -> building`
- `building -> review` (`review_requested`)
- `review -> done` (`approve` 또는 `waive`가 유효할 때)
- `review -> building` (`request_changes` 또는 `task_reopened`)
- `done -> review` (`task_reopened`)

## 3-2. Review gate lifecycle
- `not_required`
- `pending`
- `blocked_review`
- `approved`
- `waived`

전이 규칙:
- `not_required -> pending`
  - review required task로 판정될 때
- `pending -> blocked_review`
  - reviewer가 `block`
  - 필수 evidence 누락
  - 필수 check 실패
  - 권한 없는 actor가 승인 시도
- `pending -> approved`
  - 유효한 `approve`
- `pending -> waived`
  - 유효한 `waive`
- `blocked_review -> pending`
  - block 해소 + evidence 보강 완료
- `approved -> pending`
  - `task_reopened`
- `waived -> pending`
  - `task_reopened` 또는 `waiver_revoked`

## 4. Decision schema v1

review decision 최소 집합:
- `approve`
- `request_changes`
- `block`
- `waive`

`reject`는 별도 decision으로 두지 않는다.
- 수정 후 재검토가 가능한 경우는 `request_changes`
- 선결 조건 해결 전까지 정지해야 하는 경우는 `block`

### 4-1. 최소 필드
- `decision_id`
- `task_id`
- `decision`
- `actor`
- `reason`
- `evidence_refs`
- `scope`
- `created_at`

### 4-2. scope
- `task`
- `review_gate`
- `release`

v1에서는 복잡한 권한 체계보다 역할별 허용 action만 고정한다.

## 5. 역할과 권한

- requester
  - review 요청 가능
- assignee / agent
  - evidence 제출 가능
- reviewer
  - `approve`
  - `request_changes`
  - `block`
- maintainer / operator
  - `waive`
  - `reopen`

## 6. 핵심 의미 정의

### 6-1. blocked_review
`blocked_review`는 감정적 상태가 아니라 **강제 정지 상태**다.

진입 조건:
- reviewer가 `block` 결정
- 필수 evidence 누락
- 필수 check 실패
- 정책상 금지된 변경 포함
- 권한 없는 actor가 승인 시도

의미:
- 선결 조건 해결 전까지 review를 통과시킬 수 없다.
- `approve`가 들어와도 유효 승인으로 인정하지 않는다.

### 6-2. waived
`waived`는 승인 대체가 아니라 **예외 승인**이다.

허용 조건:
- low-risk 또는 사전 정의된 예외 클래스
- waive 권한 보유 actor
- waiver reason 필수 기록
- 감사 가능한 evidence/사유 남김

추가 원칙:
- waiver는 조용히 숨기지 않는다.
- dashboard에서 경고성으로 표시되어야 한다.

### 6-3. reopened
`reopened`는 단 하나의 의미만 가진다.

> 기존 review 결과가 더 이상 유효하지 않다.

reopen 발생 시:
- 기존 `approved` / `waived` 효력 종료
- gate 상태를 `pending`으로 복귀
- 새 evidence 제출 필요
- task는 `review` 또는 `building`으로 되돌릴 수 있음

## 7. Evidence 모델

Evidence는 파일 종류가 아니라 역할 기준으로 묶는다.

- `change`
  - 무엇을 바꿨는가
- `verification`
  - 제대로 동작하는가
- `context`
  - 왜 바꿨는가 / 어떤 task와 연결되는가

예시 evidence:
- PR diff
- 변경 파일 목록
- 테스트 결과
- 스크린샷
- 로그
- benchmark 결과
- linked issue
- rollback note

## 8. Evidence 부족 판정

evidence 부족은 사람 감각이 아니라 제품 규칙으로 판정한다.

기본 체크리스트:
- 변경 요약 존재
- 수행 결과 존재
- 검증 결과 존재
- 관련 링크 또는 아티팩트 존재
- reviewer가 claim을 재현할 단서 존재

필수 항목 미충족 시:
- `evidence_insufficient=true`
- gate는 `blocked_review` 또는 `pending` 유지
- `approve`는 무효 처리 가능

### 8-1. task class별 evidence profile
모든 task에 같은 evidence를 요구하지 않는다.

- code task
  - change + verification + context 필수
- doc task
  - change + context 필수, verification은 선택 또는 경량
- ops task
  - change + verification 필수, rollback note 권장

## 9. Review gate와 merge readiness

Review gate approve는 곧 merge readiness 판정이어야 한다.

즉, `approved`의 의미는:
- 지금 병합해도 됨
- 지금 completion으로 올려도 됨
- 추가 수습 없이 다음 단계로 넘어갈 수 있음

approve 이후에 대규모 수습이 남아 있다면 gate 설계가 잘못된 것이다.

## 10. Protected transitions

다음 전이는 review decision 없이는 허용하지 않는다.
- `building -> done`
- `review -> done`
- `in_review -> approved`
- `approved -> release_ready`

이 전이는 Hub에서 강제한다.
GitHub autopilot, CLI, dashboard action, API 모두 예외 없다.

## 11. Dashboard / Autopilot 연동 원칙

### 11-1. Dashboard
Dashboard는 read model이다.
직접 상태를 수정하는 원장이 아니다.

표시해야 할 최소 항목:
- task status
- review gate status
- evidence checklist
- decision timeline
- decision id
- last synced from hub

### 11-2. GitHub Autopilot
Autopilot은 일을 앞으로 밀 수는 있지만 gate를 열 수는 없다.

허용:
- issue intake
- task 생성
- 초안 plan 작성
- draft PR 생성
- 상태 보고

금지:
- approve 대체
- waived 남발
- `done` / `release_ready` 직접 전이

## 12. 안티패턴

- review gate를 `passed/failed` boolean으로 단순화
- dashboard에서 상태를 직접 수정 가능하게 설계
- bot이 PR 생성과 승인 의미를 동시에 갖게 설계
- blocked_review와 request_changes를 같은 의미처럼 사용
- waiver를 숨겨서 감사 흔적이 약해지는 설계

## 13. v1 최종 권고안

v1에서는 다음을 강하게 고정한다.

1. task 상태와 gate 상태를 분리한다.
2. decision 집합은 `approve / request_changes / block / waive` 4개로 고정한다.
3. `blocked_review`는 강제 정지 상태로 정의한다.
4. `waived`는 감사 가능한 예외 승인으로 제한한다.
5. `reopened`는 기존 승인 효력 상실의 단일 의미로 고정한다.
6. evidence 부족은 checklist 기반 규칙으로 판정한다.
7. approve 유효성은 Hub가 재검증한다.
8. dashboard는 read-only 중심, autopilot은 draft/dispatch helper로 제한한다.

## 14. 한 줄 결론

Review Gate v1의 핵심은 decision 종류를 늘리는 것이 아니라, **상태 의미를 좁게 고정하고 승인 유효성을 시스템이 강제하는 것**이다.
