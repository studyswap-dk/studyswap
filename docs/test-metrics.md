# Coverage and mutation testing

The number of tests says little about how good they are. Two measures say more, and each answers its own question (NF7):

| Measure | Question | Command | When |
|---|---|---|---|
| Coverage | Which code do the tests run? | `pnpm run test:coverage` | In CI on every pull request |
| Mutation testing | Would a test fail if the code were wrong? | `pnpm run test:mutation`, or the workflow `Mutation test` | By hand, before and after closing gaps in the tests, and at code freeze |

High coverage does not mean good tests: a test that runs a line without checking its result still counts. Mutation testing checks exactly that, so use the two together.

## Coverage

`pnpm run test:coverage` runs the unit tests with V8 coverage and writes a summary to the terminal and an HTML report to `coverage/index.html`. The settings are in `vitest.config.mts`.

**The floor.** Coverage of `domain/` and `app/actions/` must stay at or above 95 % for lines, branches, functions and statements, or the command fails, and so does CI. These are the two places the unit tests are meant to cover in full: the rules, and the Server Actions, which are public endpoints. If you add a rule or a Server Action without tests, CI tells you.

**The rest is reported, not enforced.** The pages in `app/` are tested by hand on the preview and in the acceptance test, and the database code in `lib/` by the integration tests, so their unit coverage is low on purpose. A floor for the whole codebase would either fail all the time or invite tests that only raise the number.

Do not lower the floor to make a pull request pass. Add the missing test, or, if the code really cannot be tested at unit level, discuss it in the pull request.

### Coverage of the integration tests

`pnpm run test:integration --coverage` measures how much of `lib/` the integration tests run, and writes the report to `coverage/integration/`. Docker must be running, as for the integration tests. It is reported, not enforced, and is not run in CI.

## Mutation testing

`pnpm run test:mutation` runs [StrykerJS](https://stryker-mutator.io/) on the rules in `domain/`. Stryker makes small changes to the code, called mutants: it flips a condition, empties a string or turns `>` into `>=`. For each mutant it runs the tests that cover the changed line. If a test fails, the mutant is killed. If all pass, the mutant survived, and a mistake of that kind would not be caught.

The settings are in `stryker.config.json`. `domain/programmes.ts` is left out, because it is the list of programmes and has no rules. A run takes a few minutes and writes an HTML report to `reports/mutation/mutation.html`, which lists every surviving mutant with the line and the change.

It is not part of the CI check on pull requests: it takes minutes, and the result needs judgement. Run it locally, or by hand on GitHub: the workflow `Mutation test` in `.github/workflows/mutation.yml` is started from the Actions tab, on a branch you choose, and attaches the HTML report to the run as `stryker-report`. GitHub only shows the button once the workflow is on the default branch.

A surviving mutant is not always a gap in the tests. Some do not change what the program does, for example `amount > 0` to `amount >= 0` in a sum, where 0 adds nothing. They are called equivalent mutants, and no test can kill them. Go through each surviving mutant and decide:

- **A gap:** write the test that kills it. Typical cause: a test that checks that something is refused, but not with which code
- **Equivalent:** leave it, and note it in the pull request if it is not obvious
- **Unreachable:** code no input can reach, such as the default branch of a switch the types already cover

The score is reported in the test appendix of the report, together with the assessment of the surviving mutants.
