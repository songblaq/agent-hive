# AgentHive Core v1 Integrated Plan

- 작성일: 2026-03-11
- 상태: v1 integrated summary
- 범위: AgentHive Core TASK-005

## 1. 문제 정의

AgentHive 본체는 단순한 dashboard나 오케스트레이션 스크립트 모음이 아니라,
**task / review / execution / reporting를 하나의 일관된 운영 모델로 묶는 제품 코어**여야 한다.

지금까지 정리한 핵심 문제는 네 가지다.
- review gate가 제품 규칙으로 고정되지 않으면 상태 전이가 흔들린다.
- workspace/worktree 정책이 없으면 병렬 실행 충돌이 늘어난다.
- GitHub issue autopilot은 안전 경계가 없으면 운영 리스크가 커진다.
- dashboard가 source of truth처럼 보이면 운영 모델이 왜곡된다.

## 2. v1 범위

### 포함
- review gate
- workspace/worktree policy
- GitHub issue autopilot rule
- dashboard detail / internal ops panel split
- CLI / hub / dashboard / automation 간 책임 분리

### 제외
- 세부 UI 미장센
- 멀티 테넌시 고급 권한 체계
- 외부 SaaS 확장 전반
- 고급 scheduler/autoscaling
- 완전 자율 merge/close 체계

## 3. v1 결과물 지도

| Task | 산출물 | 역할 |
|---|---|---|
| TASK-001 | `agenthive-review-gate-v1.md` | 상태 전이와 승인 규칙 고정 |
| TASK-002 | `agenthive-workspace-worktree-policy-v1.md` | 실행 위치/격리 규칙 고정 |
| TASK-003 | `agenthive-github-issue-autopilot-v1.md` | 이슈 기반 자동화 경계 고정 |
| TASK-004 | `agenthive-dashboard-detail-ops-split-v1.md` | 사용자용/운영자용 화면 분리 |
| TASK-005 | 본 문서 | 위 4개를 제품 시나리오로 통합 |

## 4. 제품 원칙

### 원칙 A. AgentHive는 source of truth다
원장은 AgentHive task/hub에 있다.
- task
- plan
- summary
- review decision
- evidence
- execution log

dashboard는 이를 읽는 read model이다.

### 원칙 B. review gate는 장식이 아니라 제어 장치다
- build 완료만으로 done/release가 되지 않는다.
- evidence + valid decision + 권한 모델을 통과해야 한다.
- autopilot/CLI/dashboard/action 모두 같은 gate를 통과한다.

### 원칙 C. 실행 면과 원장 갱신 면을 분리한다
- 메인 workspace: orchestration / summary / source-of-truth update
- isolated worktree: 구현 / 검증 / branch/PR 단위 작업
- temp sandbox: scratch / disposable 실험

### 원칙 D. autopilot은 안전 경계 안에서만 자동이다
- low-risk + policy-allowed 범위만 build_allowed
- medium/high-risk, secret, infra, security, destructive change는 human approval 필요
- fail-closed가 기본이다

### 원칙 E. public view와 operator control view를 분리한다
- public/core detail panel: 읽기 중심
- internal ops panel: 진단/재시도/감사 중심

## 5. 핵심 구조

### 5-1. Hub
역할:
- task 저장소
- 상태 전이 집행
- decision/evidence/log 축적
- source of truth 유지

### 5-2. CLI
역할:
- task 생성/조회
- review decision 기록
- worktree 생성/정리 보조
- 운영 액션 트리거

### 5-3. Automation
역할:
- GitHub issue intake
- dispatch/autopilot
- retry/escalation
- review/checkpoint/report hook

### 5-4. Dashboard
역할:
- public/core detail panel: 사용자/기여자용 read model
- internal ops panel: 운영자용 read+control surface

## 6. end-to-end 시나리오

### 시나리오 1. GitHub issue에서 task가 시작되는 경우
1. GitHub issue intake
2. AgentHive task 생성
3. risk / label / priority 기반 autopilot mode 결정
4. plan 생성
5. worktree 필요 여부 판정
6. build 실행
7. review gate 진입
8. approve / request_changes / block / waive
9. PR/comment/report 생성
10. done 또는 human follow-up

### 시나리오 2. 운영자가 panel에서 상태를 보는 경우
1. operator가 internal ops panel에서 queue / retry / blocked 상태 확인
2. panel은 hub 원장을 읽는다
3. 필요한 action은 hub/CLI/API에 명령을 보낸다
4. 결과가 hub에 기록되고 panel은 다시 읽는다

### 시나리오 3. 기여자가 public detail panel을 보는 경우
1. task objective/acceptance/status 확인
2. summary/evidence/decision result 확인
3. operator-only 정보는 보지 못함
4. source of truth 수정은 수행하지 못함

## 7. 4개 핵심 규칙의 연결

### 7-1. Review gate ↔ Autopilot
- autopilot은 final approve/waive를 대체하지 않는다.
- autopilot은 evidence를 준비하고 제안할 수 있지만 release를 여는 최종 권한은 reviewer/owner/operator에 있다.

### 7-2. Worktree policy ↔ Autopilot
- build_allowed라도 worktree preflight가 실패하면 `await_human`, `await_review_capacity`, `blocked_external`, `blocked_policy` 같은 상태로 멈춘다.
- 병렬/충돌 위험이 있는 작업은 main workspace에서 바로 실행하지 않는다.

### 7-3. Review gate ↔ Dashboard
- public panel에는 review gate status, evidence summary, decision summary만 노출한다.
- internal ops panel에는 decision/evidence/log 진단 세부가 노출된다.

### 7-4. Dashboard ↔ Source of truth
- dashboard는 원장을 수정하지 않는다.
- action은 hub/CLI/API를 통해 실행되고 dashboard는 결과만 반영한다.

## 8. 구현 우선순위

### 이미 정리 완료
- TASK-001 review gate
- TASK-002 workspace/worktree policy
- TASK-003 GitHub issue autopilot
- TASK-004 dashboard split

### 다음 구현 우선순위
1. hub data model 구체화
2. CLI command surface 정리
3. dashboard read model contract 정의
4. operator action permission mapping
5. GitHub intake/dispatch prototype

## 9. 인터페이스 경계

| 면 | 쓰기 가능 주체 | 읽기 가능 주체 | 비고 |
|---|---|---|---|
| Hub 원장 | CLI / automation / operator action | 모두 | source of truth |
| Public detail panel | 없음 | 사용자/기여자/운영자 | read-only |
| Internal ops panel | operator action via hub command | 운영자/유지보수자 | 직접 원장 수정 금지 |
| Worktree execution surface | builder / automation / operator | 관련 실행자 | review 대상 diff 생성 |

## 10. 최소 완료 판정

AgentHive Core v1은 아래를 만족하면 설계 기준선이 선다.
- [x] review gate 규칙 정의
- [x] workspace/worktree policy 정의
- [x] GitHub issue autopilot 경계 정의
- [x] dashboard/public vs ops split 정의
- [x] 위 4개가 하나의 제품 흐름으로 연결됨

## 11. 현재 결론

AgentHive Core v1은 이제 다음처럼 요약할 수 있다.

> AgentHive는 hub를 원장으로 삼고,
> review gate로 상태 전이를 통제하며,
> worktree policy로 실행 충돌을 줄이고,
> GitHub issue autopilot으로 안전한 자동화 경계를 정의하며,
> dashboard를 public detail과 internal ops로 분리한 제품 코어다.

즉, 지금 본체는 기능 추가보다 **규칙 고정 단계**를 통과했다.
다음 단계는 이 규칙들을 실제 hub/CLI/dashboard contract에 매핑하는 구현 단계다.
