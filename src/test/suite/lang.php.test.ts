import { expect } from "chai";
import { after } from "mocha";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { getInstance } from "../../lang/commons";

suite("Php Language Test Suite", () => {
  const langUtil = getInstance("php");
  after(() => {
    vscode.window.showInformationMessage("All tests done!");
  });

  test("format", () => {
    const sourceTokens = `$ username = $ _POST [ <str> ] ;
    $ password = $ _POST [ <str> ] ;
    $ self = $ _SERVER [ <str> ] ;
    $ referer = $ _SERVER [ <str> ] ;
    if ( ( ! $ username ) or ( ! $ password ) ) {
    header ( <str> ) ;
    exit ( ) ;
    }
    $ conn = @ mysql_connect ( <str> , <str> , <str> ) or die ( <str> ) ;
    $ rs = @ mysql_select_db ( <str> , $ conn ) or die ( <str> ) ;
    $ sql = <str> ;
    $ rs = mysql_query ( $ sql , $ conn ) or die ( <str> ) ;
    $ num = mysql_numrows ( $ rs ) ;
    if ( $ num != 0 ) {
    $ msg = <str> ;
    } else {
    header ( <str> ) ;
    exit ( ) ;
    }`;
    const sourceExpect = `$username = $_POST[""];
    $password = $_POST[""];
    $self = $_SERVER[""];
    $referer = $_SERVER[""];
    if ((!$username) or (!$password)) {
        header("");
        exit();
    }
    $conn = @mysql_connect("", "", "") or die("");
    $rs = @mysql_select_db("", $conn) or die("");
    $sql = "";
    $rs = mysql_query($sql, $conn) or die("");
    $num = mysql_numrows($rs);
    if ($num != 0) {
        $msg = "";
    } else {
        header("");
        exit();
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
    const s = `echo 'text'
    // comment
    echo "multi
    line
    text"
    /* block comment */
    echo <<<EOT
here doc string
EOT;
    var_dump(array(<<<EOD
trivial text
EOD
));`;
    const t = `echo ''
    echo ""
    echo ""
    var_dump(array("trivial text"));`;
    const r = langUtil.datamask(s, new Set<string>(["trivial text"]));
    expect(r.replace(/\n(( |\t)*\n)+/g, "\n")).to.equal(t);
  });
});
