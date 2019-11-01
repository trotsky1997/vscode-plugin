import { expect } from "chai";
import { after } from "mocha";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { getInstance } from "../../src/lang/commons";

suite("Python Language Test Suite", () => {
  const langUtil = getInstance("python");
  after(() => {
    vscode.window.showInformationMessage("All tests done!");
  });

  test("format", () => {
    const sourceTokens = `x = { <str> : <int> , <str> : <int> , <str> : <int> }
    y = <str> <str>
    z = <str> + <str>
    a = <str> . format ( <str> )
    class foo ( object ) :
    def f ( self ) :
    return <int> * - + <int>
    def g ( self , x , y = <int> ) :
    return y
    def f ( a ) :
    return <int> + - + a [ <int> - x : y ** <int> ]
    new_version = <UNK>
    with open ( path , <str>"rb" ) as f :`;
    const sourceExpect = `x = { "": 0, "": 0, "": 0 }
    y = "" ""
    z = "" + ""
    a = "".format("")
    class foo(object):
        def f(self):
            return 0 * -+0
        def g(self, x, y=0):
            return y
    def f(a):
        return 0 + -+a[0 - x : y ** 0]
    new_version =
    with open(path, "rb") as f:`;

    const sourceTokensLines = sourceTokens.split("\n").map((_) => _.trim());
    const sourceExpectLines = sourceExpect.split("\n").map((_) => _.trim());
    expect(sourceTokensLines.length).to.equal(sourceExpectLines.length, "test code line counts don't match");
    for (let i = 0; i < sourceTokensLines.length; i++) {
      const tokens = sourceTokensLines[i].split(" ");
      const expectedValue = sourceExpectLines[i];
      const rendered = langUtil.render(tokens, 0);
      expect(rendered, sourceTokensLines[i]).to.equal(expectedValue);
    }
  });
});
