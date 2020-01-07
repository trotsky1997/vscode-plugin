import { expect } from "chai";
import { after } from "mocha";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { getInstance } from "../../lang/commons";

suite("Go Language Test Suite", () => {
  const langUtil = getInstance("go");
  after(() => {
    vscode.window.showInformationMessage("All tests done!");
  });

  test("format", () => {
    const sourceTokens = `package sort_test
    import (
    <str>fmt
    <str>sort
    )
    type Person struct {
    Name string
    Age int
    }
    func ( p Person ) String ( ) string {
    return fmt . Sprintf ( <str>%s:<str_space>%d , p . Name , p . Age )
    }
    type ByAge [ ] Person
    func ( a ByAge ) Len ( ) int {
    return len ( a )
    }
    func ( a ByAge ) Swap ( i , j int ) {
    a [ i ] , a [ j ] = a [ j ] , a [ i ]
    }
    func ( a ByAge ) Less ( i , j int ) bool {
    return a [ i ] . Age < a [ j ] . Age
    }
    func Example ( ) {
    people := [ ] Person {
    { <str>Bob , 31 } ,
    { <str>John , 42 } ,
    { <str>Michael , 17 } ,
    { <str>Jenny , 26 } ,
    }
    fmt . Println ( people )
    sort . Sort ( ByAge ( people ) )
    fmt . Println ( people )
    }`;
    const sourceExpect = `package sort_test
    import (
        "fmt"
        "sort"
    )
    type Person struct {
        Name string
        Age int
    }
    func (p Person) String() string {
        return fmt.Sprintf("%s: %d", p.Name, p.Age)
    }
    type ByAge []Person
    func (a ByAge) Len() int {
        return len(a)
    }
    func (a ByAge) Swap(i, j int) {
        a[i], a[j] = a[j], a[i]
    }
    func (a ByAge) Less(i, j int) bool {
        return a[i].Age < a[j].Age
    }
    func Example() {
        people := []Person {
            { "Bob", 31 },
            { "John", 42 },
            { "Michael", 17 },
            { "Jenny", 26 },
        }
        fmt.Println(people)
        sort.Sort(ByAge(people))
        fmt.Println(people)
    }`;

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

  // tslint:disable: no-trailing-whitespace
  test("datamask", () => {
    const s = `string e = "text";
    string e = 'text';
    string e = \`text\`;
    string f = "trivial text";`;
    const t = `string e = "";
    string e = '';
    string e = \`\`;
    string f = "trivial text";`;
    const r = langUtil.datamask(s, new Set<string>(["trivial text"]));
    expect(r.replace(/\n(( |\t)*\n)+/g, "\n")).to.equal(t);
  });
});
