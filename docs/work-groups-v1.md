# AgentHive Work Groups v1

작성일: 2026-03-10
상태: 운영 초안

## 1. 목적

하이브 안에서 모든 작업을 한 backlog에 섞지 않고, "업무를 만드는 그룹"과 "업무를 수행하는 그룹" 그리고 그 사이의 skill/role 운영 그룹을 분리한다.

## 2. 세 그룹

### A. Project Level Up

이 그룹은 프로젝트 자체의 성숙도를 높인다.

- 버그 탐색
- 보안 검토
- 디자인 품질 검토
- 기획 보강 포인트 탐색
- 테스트/문서/운영 공백 탐색

이 그룹의 본질은 직접 구현보다 "필요한 업무를 발굴하고 정의하는 것"이다.

대표 산출물:
- audit note
- gap list
- roadmap/backlog 제안
- 새 epic/task 생성

### B. Execution

이 그룹은 이미 정의된 업무를 실제로 수행한다.

- 구현
- 테스트
- 리팩터링
- 리뷰 반영
- 디자인 적용

대표 산출물:
- 코드 변경
- 테스트 통과 기록
- review/summary 업데이트

### C. Skill & Role Ops

이 그룹은 어떤 에이전트가 어떤 skill 묶음과 역할로 움직일지 관리한다.

- 어떤 planner가 필요한가
- 어떤 designer/reviewer/security analyst가 필요한가
- 어떤 tool/skill pack이 필요한가
- 어떤 agent file/profile이 성능이 좋은가
- Kira나 manager wrapper를 둘 가치가 있는가

대표 산출물:
- role taxonomy
- agent profile standard
- shared skill pack
- tool-specific wrapper skill

## 3. 그룹 간 흐름

1. Project Level Up이 프로젝트를 진단한다.
2. 진단 결과로 execution task를 만든다.
3. 수행 중 skill/role 부족이 드러나면 Skill & Role Ops가 개입한다.
4. Skill & Role Ops는 agent profile과 skill pack을 고도화한다.
5. 다시 Project Level Up이 프로젝트 상태를 재평가한다.

## 4. 하이브에 어떻게 반영하나

### Project Level Up
- recurring review project 또는 ops task 군으로 등록
- 예: health check, security review pack, design pass, planning pass

### Execution
- 일반 프로젝트 backlog/task로 등록
- 예: feature, bugfix, refactor, dashboard UI

### Skill & Role Ops
- shared infrastructure 또는 agent ops project로 등록
- 예: shared skill standard, role matrix, session policy, Kira wrapper

## 5. 운영 팁

- Project Level Up과 Execution을 같은 카드 안에 섞지 않는다.
- Skill & Role Ops는 "도구 얘기만 하는 카드"가 아니라 실제 role/skill 운영 문제를 해결하는 카드여야 한다.
- 프로젝트가 커질수록 Project Level Up backlog는 별도 lane 또는 별도 project가 되는 편이 낫다.

## 6. 현재 권장 해석

- AgentHive 본체는 이 세 그룹을 모두 관리할 수 있어야 한다.
- OpenClaw는 각 그룹에 맞는 session/cron/orchestration을 붙이는 실행 계층이다.
- Dashboard는 이 그룹 구분이 보이도록 확장될 가치가 있다.
