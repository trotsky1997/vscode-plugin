import { expect } from "chai";
import { describe } from "mocha";
import { getInstance } from "./commons";

describe("java format", () => {
    const sourceTokens = `import java . util . regex . Matcher ;
import java . util . regex . Pattern ;
public class RegexMatches {
public static void main ( String args [] ) {
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
}
}
}`;
    const sourceExpect = `import java.util.regex.Matcher;
import java.util.regex.Pattern;
public class RegexMatches {
    public static void main(String args[]) {
        String line = "";
        String pattern = "";
        Pattern r = Pattern.compile(pattern);
        Matcher m = r.matcher(line);
        if (m.find()) {
            System.out.println("Found value: " + m.group(0));
            System.out.println("Found value: " + m.group(1));
            System.out.println("Found value: " + m.group(0));
        } else {
            System.out.println("");
        }
    }
}`;

    const langUtil = getInstance("java");
    const sourceTokensLines = sourceTokens.split("\n");
    const sourceExpectLines = sourceExpect.split("\n");
    expect(sourceTokensLines.length).to.equal(sourceExpectLines.length);
    for (let i = 0; i < sourceTokensLines.length; i++) {
        const tokens = sourceTokensLines[i].split(" ");
        const expectedValue = sourceExpectLines[i];
        it("should match spaces", () => {
            const rendered = langUtil.render(tokens, 0);
            expect(rendered).to.equal(expectedValue);
        });
    }
});
