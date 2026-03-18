# Agent Role and Skill Model v1

작성일: 2026-03-10
상태: 운영 초안

## 1. 목적

에이전트에게 단순히 `planner`, `builder`, `reviewer` 라벨만 주는 것을 넘어서, 어떤 역할이 어떤 skill 묶음과 어떤 품질 중심점을 가져야 하는지 정의한다.

## 2. 기본 원칙

- 역할은 "무슨 책임을 지는가"다.
- skill은 "그 책임을 수행하기 위한 도구/지식 묶음"이다.
- 같은 agent라도 task에 따라 다른 role/skill pack을 가질 수 있다.
- 좋은 agent file/profile은 역할과 skill을 같이 설명해야 한다.

## 3. 추천 역할 축

### Planner
- 중심: 문제 구조화, 범위 정의, 우선순위
- 필요한 skill: decomposition, spec reading, project routing, backlog shaping

### Builder
- 중심: 구현, 테스트, 수정
- 필요한 skill: coding, test running, debugging, repo-specific conventions

### Reviewer
- 중심: 버그/리스크/회귀 탐지
- 필요한 skill: diff reading, test skepticism, security smell detection

### Product/Design Reviewer
- 중심: UX 흐름, 화면 품질, 기획 완성도
- 필요한 skill: interface critique, copy critique, flow validation

### Security Reviewer
- 중심: auth, secret handling, permission model, data leakage
- 필요한 skill: threat review, config review, boundary analysis

### Skill Ops Maintainer
- 중심: shared skill, wrapper skill, agent profile 고도화
- 필요한 skill: workflow abstraction, tool comparison, packaging

## 4. skill pack 구성 원칙

### Portable pack
- 여러 도구에서 공통으로 읽을 수 있는 skill
- 예: github, summarize, shared collaboration bridge

### Runtime-bound pack
- 특정 도구 런타임에 종속된 skill
- 예: OpenClaw ACP/session skill, 특정 CLI host contract

### Project-specific pack
- 특정 repo/domain에 강하게 묶인 skill
- 예: AgentHive protocol helper, project-specific deployment skill

## 5. 언제 새 role 또는 새 skill pack이 필요한가

- 같은 유형의 task가 반복되는데 품질 편차가 클 때
- 특정 에이전트가 계속 같은 부족함을 드러낼 때
- planner와 reviewer의 판단 기준이 자꾸 충돌할 때
- 공통 prompt를 매번 다시 써야 할 때

## 6. 다음 고도화 후보

- agent profile scorecard
- role별 기본 skill allowlist
- Kira/manager wrapper role 정의
- project level up review bundles
