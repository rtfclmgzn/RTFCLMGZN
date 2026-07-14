# Story Viewer Hotfix 0.3.3

This update repairs story-card selection in Newsroom Studio and hardens the story-detail API.

- Story cards use delegated click handling so rerendering cannot detach selection.
- The center panel immediately displays a loading state.
- Failed detail responses display a visible retry panel rather than appearing inert.
- Arrays and artifact rendering are defensive against malformed optional data.
- API responses are normalized to strict JSON; non-finite model values cannot break browser parsing.
- No model call, article packaging, publication, scheduling, credential access, or budget change occurs during installation.
