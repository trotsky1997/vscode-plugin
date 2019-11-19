import { expect } from "chai";
import { after } from "mocha";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { getInstance } from "../../src/lang/commons";

suite("JavaScript Language Test Suite", () => {
  const langUtil = getInstance("js");
  after(() => {
    vscode.window.showInformationMessage("All tests done!");
  });

  test("format", () => {
    const sourceTokens = `import assert from <str>assert ;
    import { path } from <str>os ;
    let number = <int>42 ;
    var opposite = true ;
    if ( opposite ) {
    number = - <int>42 ;
    }
    square = function ( x ) {
    return x * x ;
    } ;
    const list = [ <int>1 , <int>2 , <int>3 , <int>4 , <int>5 ] ;
    math = {
    root : Math . sqrt ,
    square : square ,
    square ,
    cube : function ( x ) {
    return x * square ( x ) ;
    },
    cube ( x ) {
    return x * square ( x ) ;
    },
    } ;
    race = function ( winner , ... runners ) {
    return print ( winner , runners ) ;
    } ;
    if ( typeof elvis !== <str> && elvis !== null ) {
    alert ( <str> ) ;
    }
    cubes = ( function ( ) {
    const results = [ ] ;
    for ( let i = <int>0 , len = list . length ; i < len ; i ++ ) {
    num = list [ i ] ;
    results . push ( math . cube ( num ) ) ;
    }
    return results ;
    } ) ( ) ;
    if ( ! m ) ;
    rl . on ( <str>line , ( line ) => { } ) ;
    return [ ] ;`;
    const sourceExpect = `import assert from "assert";
    import { path } from "os";
    let number = 42;
    var opposite = true;
    if (opposite) {
        number = -42;
    }
    square = function(x) {
      return x * x;
    };
    const list = [1, 2, 3, 4, 5];
    math = {
      root: Math.sqrt,
      square: square,
      square,
      cube: function(x) {
        return x * square(x);
      },
      cube(x) {
        return x * square(x);
      },
    };
    race = function(winner, ...runners) {
      return print(winner, runners);
    };
    if (typeof elvis !== "" && elvis !== null) {
        alert("");
    }
    cubes = (function() {
      const results = [];
      for (let i = 0, len = list.length; i < len; i++) {
        num = list[i];
        results.push(math.cube(num));
      }
      return results;
    })();
    if (!m);
    rl.on("line", (line) => { });
    return [];`;

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
