import { parseMathSegments } from '../mathParse';

function runTests() {
  const tests = [
    {
      name: 'Case 1: Inline math',
      input: 'Solve $x^2-5x+6=0$ for x',
      expected: [
        { type: 'text', content: 'Solve ' },
        { type: 'inline-math', content: 'x^2-5x+6=0' },
        { type: 'text', content: ' for x' },
      ],
    },
    {
      name: 'Case 2: Block math',
      input: '$$\\int_0^1 x^2\\,dx=\\tfrac13$$',
      expected: [
        { type: 'block-math', content: '\\int_0^1 x^2\\,dx=\\tfrac13' },
      ],
    },
    {
      name: 'Case 3: Parenthesis and bracket delimiters',
      input: 'Here is \\(a+b\\) and \\[a+b\\]',
      expected: [
        { type: 'text', content: 'Here is ' },
        { type: 'inline-math', content: 'a+b' },
        { type: 'text', content: ' and ' },
        { type: 'block-math', content: 'a+b' },
      ],
    },
    {
      name: 'Case 4: Currency safety with spaces',
      input: 'It costs $5 and $10 for two items',
      expected: [
        { type: 'text', content: 'It costs $5 and $10 for two items' },
      ],
    },
    {
      name: 'Case 5: Escaped dollar sign',
      input: 'Discount is \\$5 today',
      expected: [
        { type: 'text', content: 'Discount is $5 today' },
      ],
    },
    {
      name: 'Case 6: Broken/unclosed math delimiter',
      input: 'Check $\\frac{1}{ broken',
      expected: [
        { type: 'text', content: 'Check $\\frac{1}{ broken' },
      ],
    },
    {
      name: 'Case 7: Hindi text with inline math',
      input: 'मान ज्ञात कीजिए: $\\sqrt{16}$ उत्तर',
      expected: [
        { type: 'text', content: 'मान ज्ञात कीजिए: ' },
        { type: 'inline-math', content: '\\sqrt{16}' },
        { type: 'text', content: ' उत्तर' },
      ],
    },
  ];

  let passed = 0;
  for (const t of tests) {
    const result = parseMathSegments(t.input);
    const pass = JSON.stringify(result) === JSON.stringify(t.expected);
    if (!pass) {
      console.error(`FAILED: ${t.name}`);
      console.error('Got:', JSON.stringify(result, null, 2));
      console.error('Expected:', JSON.stringify(t.expected, null, 2));
      throw new Error(`FAILED: ${t.name}`);
    } else {
      passed++;
    }
  }
  console.log(`All ${passed} mathParse unit tests passed!`);
}

runTests();
