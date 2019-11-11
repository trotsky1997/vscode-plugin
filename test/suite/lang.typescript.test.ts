import { expect } from "chai";
import { after } from "mocha";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { getInstance } from "../../src/lang/commons";

suite("TypeScript Language Test Suite", () => {
  const langUtil = getInstance("ts");
  after(() => {
    vscode.window.showInformationMessage("All tests done!");
  });

  test("format", () => {
    const sourceTokens = `import { expect } from <str>chai ;
    import { after } from <str>mocha ;
    import * as vscode from <str>vscode ;
    import { getInstance } from <str>../../src/lang/commons ;
    class Student {
    fullName : string ;
    constructor ( public firstName : string , public middleInitial : string , public lastName : string ) {
    this . fullName = firstName + <str><str_space> + middleInitial + <str><str_space> + lastName ;
    }
    }
    interface Person {
    firstName : string ;
    lastName : string ;
    }
    function greeter ( person : Person ) {
    return <str>Hello,<str_space> + person . firstName + <str><str_space> + person . lastName ;
    }
    let user = new Student ( <str>Jane , <str>M. , <str>User ) ;
    document . body . textContent = greeter ( user ) ;
    if ( ! m ) ;
    export = Updater ;
    new Set < string > ( ) ;
    const [ a , b ] = [ 1 , 2 ] ;`;
    const sourceExpect = `import { expect } from "chai";
    import { after } from "mocha";
    import * as vscode from "vscode";
    import { getInstance } from "../../src/lang/commons";
    class Student {
        fullName: string;
        constructor(public firstName: string, public middleInitial: string, public lastName: string) {
            this.fullName = firstName + " " + middleInitial + " " + lastName;
        }
    }
    interface Person {
        firstName: string;
        lastName: string;
    }
    function greeter(person: Person) {
        return "Hello, " + person.firstName + " " + person.lastName;
    }
    let user = new Student("Jane", "M.", "User");
    document.body.textContent = greeter(user);
    if (!m);
    export = Updater;
    new Set<string>();
    const [a, b] = [1, 2];`;

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
