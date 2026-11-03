import axe from 'axe-core';

/**
 * Runs axe on part of the page and returns one readable line per problem, so a failing
 * test names the rule and the element. Colour contrast is skipped because jsdom has no
 * layout or styles to measure it with. The browser test checks contrast.
 */
export async function accessibilityProblems(root: Element): Promise<string[]> {
  const results = await axe.run(root, {
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} (${violation.nodes
        .map((node) => node.target.join(' '))
        .join(', ')})`,
  );
}
