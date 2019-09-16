import { expect } from "chai";
import { after } from "mocha";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { getInstance } from "../../src/lang/commons";

suite("Extension Test Suite", () => {
  after(() => {
    vscode.window.showInformationMessage("All tests done!");
  });

  test("cpp format", () => {
    const sourceTokens = `const int kStateFoo = 0 ;
    typedef struct linked_list LinkedList ;
    typedef enum {
    MODE_FOO ,
    MODE_BAR ,
    MODE_BAZ ,
    MODE_QUX
    } Mode ;
    typedef enum {
    kStateFoo ,
    kStateBar ,
    kStateBaz ,
    kStateQux
    } State ;
    typedef struct sample {
    int first_field ;
    bool second_field ;
    Mode mode ;
    State state ;
    struct sample * next ;
    } Sample ;
    bool SampleEqual ( Sample * self , Sample * other ) {
    if ( self == NULL && other == NULL ) {
    return true ;
    }
    if ( self == NULL || other == NULL ) {
    return false ;
    }
    if ( self -> first_field == other -> first_field &&
    self -> second_field == other -> second_field &&
    self -> state == other -> state &&
    self -> mode == other -> mode &&
    self -> next == other -> next ) {
    return true ;
    }
    return false ;
    }
    Sample * SampleNew ( int first_field ,
    bool second_field ,
    Mode mode ,
    State state ,
    Sample * next ) {
    Sample * sample = ( Sample * ) malloc ( sizeof ( * sample ) ) ;
    if ( sample == NULL ) {
    return NULL ;
    }
    memset ( sample , 0 , sizeof ( sample ) ) ;
    sample -> first_field = first_field ;
    sample -> second_field = second_field ;
    sample -> mode = mode ;
    sample -> state = state ;
    sample -> next = next ;
    return sample ;
    }
    Sample * SampleClone ( Sample * sample ) {
    if ( sample == NULL ) {
    return NULL ;
    }
    return SampleNew ( sample -> first_field ,
    sample -> second_field ,
    sample -> mode ,
    sample -> state ,
    sample -> next ) ;
    }
    static void SampleDoSomethingWithALongName (
    Sample * sample ,
    int parameter_with_a_long_name ,
    bool another_parameter ,
    int another_parameter ) {
    if ( sample == NULL ) {
    return ;
    }
    bool local_variable ;
    if ( parameter_with_a_long_name == kStateFoo ) {
    local_variable = true ;
    } else {
    local_variable = false ;
    }
    sample -> first_parameter += another_parameter ;
    sample -> second_parameter |= local_variable ;
    }`;
    const sourceExpect = `const int kStateFoo = 0;
    typedef struct linked_list LinkedList;
    typedef enum {
      MODE_FOO,
      MODE_BAR,
      MODE_BAZ,
      MODE_QUX
    } Mode;
    typedef enum {
      kStateFoo,
      kStateBar,
      kStateBaz,
      kStateQux
    } State;
    typedef struct sample {
      int first_field;
      bool second_field;
      Mode mode;
      State state;
      struct sample *next;
    } Sample;
    bool SampleEqual(Sample *self, Sample *other) {
      if (self == NULL && other == NULL) {
        return true;
      }
      if (self == NULL || other == NULL) {
        return false;
      }
      if (self->first_field == other->first_field &&
          self->second_field == other->second_field &&
          self->state == other->state &&
          self->mode == other->mode &&
          self->next == other->next) {
        return true;
      }
      return false;
    }
    Sample *SampleNew(int first_field,
                      bool second_field,
                      Mode mode,
                      State state,
                      Sample *next) {
      Sample *sample = (Sample *)malloc(sizeof(*sample));
      if (sample == NULL) {
        return NULL;
      }
      memset(sample, 0, sizeof(sample));
      sample->first_field = first_field;
      sample->second_field = second_field;
      sample->mode = mode;
      sample->state = state;
      sample->next = next;
      return sample;
    }
    Sample *SampleClone(Sample *sample) {
      if (sample == NULL) {
        return NULL;
      }
      return SampleNew(sample->first_field,
                       sample->second_field,
                       sample->mode,
                       sample->state,
                       sample->next);
    }
    static void SampleDoSomethingWithALongName(
        Sample *sample,
        int parameter_with_a_long_name,
        bool another_parameter,
        int another_parameter) {
      if (sample == NULL) {
        return;
      }
      bool local_variable;
      if (parameter_with_a_long_name == kStateFoo) {
        local_variable = true;
      } else {
        local_variable = false;
      }
      sample->first_parameter += another_parameter;
      sample->second_parameter |= local_variable;
    }`;

    const langUtil = getInstance("cpp");
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
