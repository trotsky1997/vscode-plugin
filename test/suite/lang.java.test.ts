import { expect } from "chai";
import { after } from "mocha";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { getInstance } from "../../src/lang/commons";

suite("Java Language Test Suite", () => {
  const langUtil = getInstance("java");
  after(() => {
    vscode.window.showInformationMessage("All tests done!");
  });

  test("format", () => {
    const sourceTokens = `import java . util . regex . Matcher ;
    import java . util . regex . Pattern ;
    public class RegexMatches {
    public static void main ( String args [ ] ) {
    String line = <str> ;
    String pattern = <str> ;
    Pattern r = Pattern . compile ( pattern ) ;
    Matcher m = r . matcher ( line ) ;
    if ( m . find ( ) ) {
    System . out . println ( <str> + m . group ( <int>0 ) ) ;
    System . out . println ( <str> + m . group ( <int>1 ) ) ;
    System . out . println ( <str> + m . group ( <int> ) ) ;
    } else {
    System . out . println ( <str> ) ;
    if ( ! m ) ;
    }
    }
    } <ENTER>
    @ TestClass SS { }
    String [ ] split = line . split ( <str> )
    char [ ] c ;
    ArrayList < String > l = new ArrayList < > ( ) ;
    switch ( a ) { }
    catch ( Exception e ) { }`;
    const sourceExpect = `import java.util.regex.Matcher;
    import java.util.regex.Pattern;
    public class RegexMatches {
        public static void main(String args[]) {
            String line = "";
            String pattern = "";
            Pattern r = Pattern.compile(pattern);
            Matcher m = r.matcher(line);
            if (m.find()) {
                System.out.println("" + m.group(0));
                System.out.println("" + m.group(1));
                System.out.println("" + m.group(0));
            } else {
                System.out.println("");
                if (!m);
            }
        }
    }↵
    @TestClass SS { }
    String[] split = line.split("")
    char[] c;
    ArrayList<String> l = new ArrayList<>();
    switch (a) { }
    catch (Exception e) { }`;

    const sourceTokensLines = sourceTokens.split("\n").map((_) => _.trim());
    const sourceExpectLines = sourceExpect.split("\n").map((_) => _.trim().replace("↵", "\n"));
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
    const s = `String a = "text";
    // comment
    String b = "text";
    // comment with quotes "text"
    String c = "text"; // comment with single quotes 'text'
    String d = "text";
    /* block
    "text"
    'text'
    comment*/
    String e = "text"; /* block
    "text"
    'text'
    comment*/ String f = "trivial text";`;
    const t = `String a = "";
    String b = "";
    String c = ""; 
    String d = "";
    String e = "";  String f = "trivial text";`;
    const r = langUtil.datamask(s, new Set<string>(["trivial text"]));
    expect(r.replace(/\n(( |\t)*\n)+/g, "\n")).to.equal(t);
  });
});
