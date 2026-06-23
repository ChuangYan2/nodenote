import * as assert from 'assert';
import { parseView, serializeView } from '../../core/view';

// The custom editor's document<->webview sync goes through these pure functions. The full unit
// suite lives in src/core/*.test.ts (run via `npm run test:core`); this is a compile-and-smoke
// check inside the Electron host.

const SAMPLE = `<!-- inbox: type=question; status=today,important; id=q1 -->
## ❓ How does FMCW range resolution depend on chirp bandwidth? ^q1

Body.

<!-- inbox: type=answer; parent=q1; id=a1 -->
### 💡 Answer — bandwidth ^a1

Δr = c / (2·B).

<!-- inbox: type=note -->
## A plain note

Just a note.
`;

suite('view model', () => {
	test('groups questions with answers', () => {
		const view = parseView(SAMPLE);
		assert.strictEqual(view.length, 2);
		assert.strictEqual(view[0].answers.length, 1);
		assert.strictEqual(view[1].answers.length, 0);
	});

	test('round-trips back to identical markdown', () => {
		assert.strictEqual(serializeView(parseView(SAMPLE)), SAMPLE);
	});
});
