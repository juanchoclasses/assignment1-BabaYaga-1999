import Cell from "./Cell"
import SheetMemory from "./SheetMemory"
import { ErrorMessages } from "./GlobalDefinitions";

export class FormulaEvaluator {
  // Define a function called update that takes a string parameter and returns a number
  private _errorOccured: boolean = false;
  private _errorMessage: string = "";
  private _currentFormula: FormulaType = [];
  private _lastResult: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;

  constructor(memory: SheetMemory) {
    this._sheetMemory = memory;
  }

  /**
    * place holder for the evaluator.   I am not sure what the type of the formula is yet 
    * I do know that there will be a list of tokens so i will return the length of the array
    * 
    * I also need to test the error display in the front end so i will set the error message to
    * the error messages found In GlobalDefinitions.ts
    * 
    * according to this formula.
    * 
    7 tokens partial: "#ERR",
    8 tokens divideByZero: "#DIV/0!",
    9 tokens invalidCell: "#REF!",
  10 tokens invalidFormula: "#ERR",
  11 tokens invalidNumber: "#ERR",
  12 tokens invalidOperator: "#ERR",
  13 missingParentheses: "#ERR",
  0 tokens emptyFormula: "#EMPTY!",
    * 
   */

  evaluate(formula: FormulaType) {
    this._result = 0;
    this._errorMessage = "";

    if (formula.length === 0) {
      this._errorMessage = ErrorMessages.emptyFormula;
      return;
    }

    if (formula.length === 1 && this.isNumber(formula[0])) {
      this._result = Number(formula[0]);
      return;
    }

    if (formula.length === 2 && this.isNumber(formula[0]) && !this.isNumber(formula[1])) {
      this._result = Number(formula[0]);
      this._errorMessage = ErrorMessages.invalidFormula;
      return;
    }

    if (formula.length === 4) {
      formula = formula.slice(0, 3);
      this._errorMessage = ErrorMessages.invalidFormula;
    }

    let operandsStack: number[] = [];
    let operatorsStack: string[] = [];

    try {
      for (let i = 0; i < formula.length; i++) {
        let token = formula[i];

        if (this.isNumber(token)) {
          operandsStack.push(Number(token));
        } else if (this.isCellReference(token)) {
          let [value, error] = this.getCellValue(token);
          if (error) {
            this._errorMessage = error;
            return;
          }
          operandsStack.push(value);
        } else if (token === "(") {
          operatorsStack.push(token);
        } else if (token === ")") {
          while (operatorsStack.length && operatorsStack[operatorsStack.length - 1] !== "(") {
            this.compute(operandsStack, operatorsStack);
          }
          operatorsStack.pop(); // Remove the "("
        } else {
          while (
            operatorsStack.length &&
            this.precedence(operatorsStack[operatorsStack.length - 1]) >= this.precedence(token)
          ) {
            this.compute(operandsStack, operatorsStack);
          }
          operatorsStack.push(token);
        }
      }

      while (operatorsStack.length) {
        if (operatorsStack[operatorsStack.length - 1] === "(") {
          this._errorMessage = ErrorMessages.missingParentheses;
          return;
        }
        this.compute(operandsStack, operatorsStack);
      }

      if (operandsStack.length !== 1 || formula.length < 3) {
        this._errorMessage = ErrorMessages.invalidFormula;
        return;
      }

      this._result = operandsStack.pop() || 0;
    } catch (error) {
      if (!this._errorMessage) {
        this._errorMessage = ErrorMessages.invalidFormula;
      }
      if (operandsStack.length === 1) {
        this._result = operandsStack[0];
      }
    }
  }

  precedence(op: string): number {
    switch (op) {
      case "+":
      case "-":
        return 1;
      case "*":
      case "/":
        return 2;
      default:
        return 0;
    }
  }

  compute(operandsStack: number[], operatorsStack: string[]) {
    const op = operatorsStack.pop();
    if (operandsStack.length < 2) {
      this._errorMessage = ErrorMessages.invalidFormula;
      throw new Error("Invalid formula");
    }
    const b = operandsStack.pop() || 0;
    const a = operandsStack.pop() || 0;
    switch (op) {
      case "+":
        operandsStack.push(a + b);
        break;
      case "-":
        operandsStack.push(a - b);
        break;
      case "*":
        operandsStack.push(a * b);
        break;
      case "/":
        if (b === 0) {
          this._errorMessage = ErrorMessages.divideByZero;
          this._result = Infinity;
          throw new Error(ErrorMessages.divideByZero);
        }
        operandsStack.push(a / b);
        break;
      default:
        this._errorMessage = ErrorMessages.invalidOperator;
        throw new Error("Invalid operator");
    }
  }

  public get error(): string {
    return this._errorMessage
  }

  public get result(): number {
    return this._result;
  }




  /**
   * 
   * @param token 
   * @returns true if the toke can be parsed to a number
   */
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   * 
   * @param token
   * @returns true if the token is a cell reference
   * 
   */
  isCellReference(token: TokenType): boolean {

    return Cell.isValidCellLabel(token);
  }

  /**
   * 
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   * 
   */
  getCellValue(token: TokenType): [number, string] {

    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error !== "" && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (formula.length === 0) {
      return [0, ErrorMessages.invalidCell];
    }


    let value = cell.getValue();
    return [value, ""];

  }


}

export default FormulaEvaluator;