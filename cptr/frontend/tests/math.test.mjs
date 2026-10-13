import assert from 'node:assert/strict';
import test from 'node:test';
import katex from 'katex';
import { mathMarkdown } from '../src/lib/components/markdown/math.ts';

function mathTokens(source) {
	const found = [];
	mathMarkdown.walkTokens(mathMarkdown.lexer(source), (token) => {
		if (token.type === 'mathBlock' || token.type === 'mathInline') found.push(token);
	});
	return found;
}

test('recognizes dollar and backslash delimiters without damaging TeX', () => {
	for (const [source, text, display] of [
		[
			String.raw`Inline $x_i^2 + \bar\delta_i$, then text.`,
			String.raw`x_i^2 + \bar\delta_i`,
			false
		],
		[String.raw`Inline \(x_i^2\), then text.`, 'x_i^2', false],
		['$$\nx_i^2\n$$', '\nx_i^2\n', true],
		[String.raw`\[x_i^2\]`, 'x_i^2', true],
		['Text $$x_i^2$$ after.', 'x_i^2', true],
		['before\n$$\nx_i^2\n$$\nafter', '\nx_i^2\n', true],
		['- $x_i$\n- $y_i$', 'x_i', false]
	]) {
		const token = mathTokens(source)[0];
		assert.ok(token, source);
		assert.equal(token.text, text);
		assert.equal(token.displayMode, display);
	}
});

test('preserves aligned environments, escaped dollars, and research notation', () => {
	const equation = String.raw`\begin{aligned}
Y_i &\sim \operatorname{Poisson}(E_i\lambda_i),\\
\log\lambda_i &= \alpha+\beta_1\log(1+T_i/A_i)+\beta_2 C_i+\beta_3 F_i+b_i.
\end{aligned}`;
	const token = mathTokens('$$\n' + equation + '\n$$')[0];
	assert.equal(token.text.trim(), equation);
	assert.match(katex.renderToString(token.text, { displayMode: true }), /class="katex"/);
	assert.doesNotThrow(() =>
		katex.renderToString(
			String.raw`\bar\delta^{(r)}_i = \prod_{s \le r} \delta^{(s)}_{\mathrm{par}(i,s)}`
		)
	);
	assert.equal(mathTokens(String.raw`$\text{cost: \$5}$`)[0].text, String.raw`\text{cost: \$5}`);
});

test('leaves code, currency and escaped delimiters alone', () => {
	for (const source of [
		'`$x_i$`',
		'```python\nprint("$x$")\n```',
		'$5 and $10',
		String.raw`\$x\$`,
		'$ not math $'
	]) {
		assert.equal(mathTokens(source).length, 0, source);
	}
	const code = mathMarkdown.lexer('```math\nx_i^2\n```')[0];
	assert.equal(code.type, 'code');
	assert.equal(code.lang, 'math');
	assert.equal(code.text, 'x_i^2');
});

test('incomplete streamed expressions do not throw and complete expressions recover', () => {
	const source = String.raw`Answer: $$\begin{aligned}x_i &= 1\\y_i &= 2\end{aligned}$$`;
	for (let i = 0; i <= source.length; i++)
		assert.doesNotThrow(() => mathMarkdown.lexer(source.slice(0, i)));
	assert.equal(mathTokens(source).length, 1);
	assert.equal(mathTokens('Incomplete $x_i').length, 0);
});

test('currency next to code or math does not consume the following expression', () => {
	assert.equal(mathTokens('Prices: $5 and $10. Code: `$x$`.').length, 0);
	assert.deepEqual(
		mathTokens('Prices: $5 and $10; compare $x_i$.').map((t) => t.text),
		['x_i']
	);
});
