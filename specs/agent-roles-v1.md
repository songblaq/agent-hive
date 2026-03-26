---
status: implemented
last-verified: "2026-03-25"
---

# Agent Roles & Groups v1

## 1. Overview

AgentHive의 에이전트 작업은 두 그룹으로 나뉜다:
- **Project Level Up** — 프로젝트를 검토/분석하여 업무를 생성하는 그룹
- **Task Execution** — 생성된 업무를 실제 수행하는 그룹

중간에 **Skill Management** 레이어가 있어 에이전트의 역할/스킬을 정의하고 최적화한다.

## 2. Project Level Up Group

### 역할
프로젝트의 성숙도를 높이기 위해 분석하고, 발견된 이슈를 태스크로 변환한다.
**업무를 하는 것이 아니라 업무를 만드는 그룹.**

### 하위 역할

| Role ID | Name | Focus | Output |
|---------|------|-------|--------|
| `quality-analyst` | 코드 품질 분석가 | 코드 패턴, 중복, 복잡도, 테스트 커버리지 | 리팩터링/테스트 태스크 |
| `security-analyst` | 보안 분석가 | OWASP, 입력 검증, 인증/인가, 비밀 관리 | 보안 수정 태스크 |
| `design-analyst` | 설계 분석가 | API 설계, 모듈 경계, 확장성, 패턴 일관성 | 설계 개선 태스크 |
| `product-analyst` | 기획 분석가 | 기능 갭, UX, 사용자 시나리오, 에러 처리 | 기능 추가/개선 태스크 |
| `ops-analyst` | 운영 분석가 | 빌드/배포, 모니터링, 성능, 문서화 | 운영 개선 태스크 |

### 작업 흐름
```
1. 프로젝트 선택 (path 기반 resolve)
2. 분석 관점 선택 (quality/security/design/product/ops)
3. 코드/구조/문서 리뷰 실행
4. 발견 사항을 severity별로 분류
5. 각 발견 사항을 AgentHive 태스크로 생성
6. BACKLOG.md 업데이트
```

### Level Up 태스크 생성 규칙
- 발견 사항은 구체적이고 실행 가능해야 함
- 각 태스크에 category 태그: `level-up:{aspect}` (예: `level-up:quality`, `level-up:security`)
- priority는 severity 기반: critical → high, major → medium, minor → low
- acceptance 기준은 검증 가능해야 함

## 3. Task Execution Group

### 역할
생성된 태스크를 claim하고, 적절한 스킬을 갖춰서 실행한다.

### 하위 역할

| Role ID | Name | Skills | Best Agent Tools |
|---------|------|--------|------------------|
| `builder` | 구현자 | 코딩, 리팩터링, 테스트 작성 | Claude Code, Codex |
| `planner` | 설계자 | 아키텍처, plan.md 작성, 의사결정 | Claude Code (Opus) |
| `reviewer` | 리뷰어 | 코드 리뷰, 검증, 테스트 실행 | Codex, Claude Code |
| `tester` | 테스터 | E2E 테스트, 통합 테스트, QA | Codex, Cursor |
| `documenter` | 문서가 | API 문서, 가이드, 변경 로그 | Claude Code (Haiku) |

### 스킬 장착 프로세스
```
1. 태스크 claim
2. 태스크의 category/tags 분석
3. 필요 스킬 식별 (자동 또는 수동)
4. ~/.agent/skills/ 에서 관련 스킬 로드
5. 스킬 가이드에 따라 작업 수행
6. 작업 완료 후 스킬 효과 피드백
```

## 4. Skill Management Layer

### 역할
에이전트와 스킬의 매핑을 관리하고 최적화한다.

### 구성요소

#### 4.1 Skill Catalog (`~/.agent/skills/`)
- 공유 스킬: `~/.agent/skills/{domain}/` (모든 도구가 접근)
- 도구별 스킬: `~/.{tool}/skills/` (도구 전용)
- 프로젝트 스킬: `{repo}/.agenthive/skills/` (프로젝트 전용)

#### 4.2 Agent Profile (`~/.agenthive/agents/{tool}.yaml`)
기존 프로필에 스킬 섹션 추가:
```yaml
agent_id: claude-code
tool: "Claude Code"
type: terminal
capabilities: [...]
limitations: [...]
preferred_roles: [builder, planner]
skills:
  loaded:
    - agenthive/orchestrator
    - agenthive/task-protocol
  recommended:
    - agenthive/project-check
config_files:
  instructions: "CLAUDE.md"
  skills_dir: ".claude/skills/"
```

#### 4.3 Skill Effectiveness Tracking
스킬 사용 후 효과를 기록:
- 어떤 태스크에 어떤 스킬을 사용했는가
- 성공/실패 비율
- 스킬 고도화 필요 여부

## 5. Agent Profile Extension

### 현재
```yaml
agent_id: claude-code
tool: "Claude Code"
preferred_roles: [builder, planner]
```

### 제안 확장
```yaml
agent_id: claude-code-1
tool: claude-code
instance: 1
preferred_roles: [builder, planner]
group: execution              # level-up | execution | both
specialization: backend       # backend, frontend, infra, docs, security
skills:
  loaded: [agenthive/orchestrator, agenthive/task-protocol]
  auto_equip: true             # 태스크에 맞게 자동 스킬 장착
performance:
  tasks_completed: 12
  avg_review_rounds: 1.2
  preferred_categories: [feature, bugfix, refactoring]
```

## 6. 워크플로우 통합

```
[Project Level Up Group]
  quality-analyst → 태스크 생성
  security-analyst → 태스크 생성
  design-analyst → 태스크 생성
       ↓
[Skill Management]
  태스크 분류 → 필요 스킬 식별 → 에이전트 매핑
       ↓
[Task Execution Group]
  builder → 구현
  reviewer → 검증
  tester → 테스트
       ↓
[다시 Level Up으로 순환]
```

## 7. 구현 우선순위

1. **Phase 1**: Level Up 분석 파이프라인 (quality, security, design)
2. **Phase 2**: 에이전트 프로필 확장 (group, specialization, skills)
3. **Phase 3**: Skill auto-equip 로직 (태스크→스킬 자동 매핑)
4. **Phase 4**: 성과 추적 + 스킬 고도화 루프
