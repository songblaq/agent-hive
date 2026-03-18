# AgentHive Workspace / Worktree Policy v1

- 작성일: 2026-03-11
- 상태: Draft
- 범위: AgentHive core v1
- 목적: aggregation/orchestration 중심의 메인 컨텍스트와 실제 실행 단위의 격리 작업 공간을 분리하는 정책을 정의한다.

## 1. 한 줄 정의

메인 컨텍스트는 **aggregation / orchestration / source-of-truth 갱신**에 집중하고, 실제 구현·수정·실험 작업은 가능한 한 **격리된 실행 환경(worktree 또는 동등한 isolated workspace)** 에서 수행한다.

## 2. 배경 판단

병렬 에이전트 운영에서 충돌은 주로 아래에서 발생한다.
- 같은 파일 동시 수정
- 공용 설정 파일 오염
- task 경계가 불분명한 변경 묶음
- review와 merge readiness 기준 부재

따라서 v1에서는 다음 방향을 채택한다.
- main workspace는 운영 원장 갱신용으로 좁게 유지
- 실제 산출물 변경은 isolated execution 우선
- review gate는 merge readiness + cleanup permission 판정 지점으로 사용

## 3. 공간 모델

### 3-1. Main context / main workspace
역할:
- backlog 갱신
- task 생성
- 상태 전이 기록
- decision / log / summary / plan 메타데이터 갱신
- orchestration 및 aggregation
- 경미한 단독 문서 정리

원칙:
- 코드 변경 기본 금지
- 공용 계약 파일 수정 제한
- 병렬 충돌 가능성이 있는 산출물 수정 금지

### 3-2. Isolated execution workspace
형태:
- git worktree
- 별도 branch checkout
- sandbox/temp repo clone
- 향후 ACP/agent runtime 전용 격리 워크스페이스

역할:
- 코드 수정
- 테스트 수행
- 실험성 구현
- branch/PR 단위 산출물 생성
- rollback 또는 discard 가능한 작업 수행

## 4. 기본 정책

### 4-1. 기본 원칙
- 메인 컨텍스트는 지휘한다.
- 실제 변경은 격리된 실행 환경에서 만든다.
- source of truth 갱신은 main workspace에서 한다.
- review 대상 snapshot은 isolated workspace 기준으로 본다.

### 4-2. risk 기반 실행 위치 결정
- low-risk + non-code + 단독 작업만 main workspace 허용
- 코드 변경이 1파일이라도 들어가면 기본값은 isolated workspace
- 병렬 충돌 가능성이 높으면 문서 작업도 isolated workspace

## 5. task 유형별 정책

### 5-1. main workspace 허용
- task 생성/상태 전이/summary·log·decision 기록
- backlog 정리, 라벨링, 메타데이터 보정
- 단독 수행 소규모 문서 수정
- 코드/설정/공용 계약 파일을 건드리지 않는 조사 결과 정리
- dashboard read model이 아닌 내부 운영 메모 갱신

### 5-2. isolated workspace 권장
- 코드 수정 전반
- 테스트 추가/수정
- 설정 파일 변경
- schema/API/interface 변경
- build artifact에 영향을 주는 작업
- PR/merge 단위로 남아야 하는 문서 변경
- 같은 repo에서 다른 agent와 병렬 진행 중인 작업

### 5-3. isolated workspace 강제
- 둘 이상의 agent가 동시에 수행하는 task
- branch/PR 생성 예정 task
- refactor / rename / move 등 범위가 넓은 변경
- shared file 수정
  - `package.json`
  - lockfile
  - tsconfig
  - CI
  - root config
  - core spec
- rollback 가능성을 확보해야 하는 실험성 변경
- review gate 통과 후 merge readiness 판정이 필요한 구현 작업 전반

## 6. 1 task = 1 execution scope

원칙:
- 한 isolated workspace에는 하나의 task 또는 하나의 reviewable scope만 담는다.
- 여러 task를 한 worktree에 섞지 않는다.
- 한 task의 산출물 범위가 커지면 subtask 단위로 쪼갠다.

효과:
- diff 해석 쉬움
- review 대상 명확
- merge / rollback / cleanup 쉬움

## 7. path reservation 정책

병렬 충돌을 줄이기 위해 task 시작 시 핵심 수정 경로를 예약한다.

예:
- `src/auth/**`
- `docs/core/**`
- `schemas/review-gate/**`
- `dashboard/contracts/**`

규칙:
- 예약 경로 중복 시 경고 또는 dispatch 보류
- shared file은 단독 수정 원칙
- 공용 파일을 두 agent가 동시에 만지지 않음

## 8. shared file 단독 수정 원칙

다음 파일/경로는 병렬 수정 금지 대상이다.
- root config
- package manager lockfile
- CI 설정
- 핵심 schema
- core spec
- 공용 backlog / registry / contract file

이 파일을 포함하는 task는 isolated workspace 강제 + 단독 점유 권장이다.

## 9. Review gate와의 연결

build 완료는 done이 아니다.
구현이 끝나면 task는 `review`로 이동하고, 해당 isolated workspace가 review snapshot 역할을 한다.

Review gate에서 확인할 최소 항목:
- plan/scope 대비 diff 일치 여부
- 테스트/검증 evidence
- 금지 경로 침범 여부
- unresolved TODO / debug code 존재 여부
- merge conflict 가능성
- base branch drift 여부

### 9-1. decision별 후속 처리

#### approve
- 의미: merge readiness 확보
- 후속: merge 수행 가능
- merge 성공 시 cleanup 가능

#### request_changes
- 의미: 같은 execution scope에서 수정 계속
- 후속: cleanup 금지
- task는 `building` 또는 `rework`로 복귀

#### block
- 의미: 선결 조건 해소 전까지 정지
- 후속: cleanup 금지
- evidence 보강 또는 정책 위반 해소 필요

#### waive
- 의미: 정책상 허용된 예외 승인
- 후속: 사유 기록 필수
- merge 후 cleanup 가능

## 10. cleanup 정책

cleanup은 단순히 작업이 끝났다고 바로 하지 않는다.

cleanup 가능 조건:
- `approve` 또는 유효한 `waive`
- merge 완료 또는 결과 확정
- 필요한 evidence / decision 기록 완료
- 후속 reopening 가능성에 대비한 기록 보존

cleanup 금지 조건:
- `request_changes`
- `block`
- merge 미완료
- evidence 불충분

## 11. Autopilot / dispatch 선행 검사

자동 dispatch 전에 아래를 검사한다.
- protected branch 여부
- 경로 예약 충돌 여부
- 기존 활성 isolated workspace 존재 여부
- review 대기 task 존재 여부
- shared file 포함 여부
- risk tier / label / repo policy 적합 여부

판정:
- 통과 시 isolated execution 생성
- 미통과 시 queue 보류 또는 human review 요청

## 12. 메인 컨텍스트와 격리 실행의 역할 분리

### main context가 맡는 일
- 문제 분해
- task 생성
- agent 배정
- 결과 수집
- 요약/문서화
- state transition 기록

### isolated execution이 맡는 일
- 실제 수정
- 테스트
- 코드 생성
- patch / PR / diff 생성
- 실패 시 rollback 또는 discard

즉, 메인 컨텍스트는 **오케스트레이터**, 격리 실행 환경은 **실행기**다.

## 13. aggregation/orchestration 기본 모델

권장 모델:
- main session / main context
  - aggregation + orchestration
- isolated worker session
  - implementation + experiment + patch generation
- hub
  - source of truth
- dashboard
  - read model

이 구조의 장점:
- 메인 컨텍스트 오염 감소
- 병렬 agent 활용 증가
- 충돌 원인 추적 쉬움
- review gate와 merge readiness 연결 가능

## 14. 안티패턴

- main workspace 허용 범위를 넓혀서 기준이 무너지는 것
- 작은 수정이라는 이유로 코드 변경을 메인 컨텍스트에서 직접 처리하는 것
- 여러 task를 하나의 worktree에 섞는 것
- shared file을 병렬 수정하는 것
- review gate와 cleanup을 분리해 approve 후 수동 수습이 남는 구조

## 15. v1 최종 권고안

1. 메인 컨텍스트는 aggregation / orchestration 중심으로 유지한다.
2. 실제 구현은 가능한 한 isolated execution으로 보낸다.
3. 코드 변경은 사실상 기본적으로 isolated workspace에서 수행한다.
4. 병렬 작업과 shared file 수정은 isolated workspace 강제다.
5. `1 task = 1 execution scope = 1 review snapshot` 원칙을 지킨다.
6. review gate는 merge readiness + cleanup permission 게이트로 사용한다.
7. source of truth 갱신만 main workspace에서 한다.

## 16. 한 줄 결론

AgentHive core의 workspace policy는 "메인은 지휘와 기록, 실제 변경은 격리 실행"으로 고정하고, **review gate에서 merge 가능 여부와 cleanup 가능 여부를 함께 판정하는 구조**로 가는 것이 가장 안전하다.
