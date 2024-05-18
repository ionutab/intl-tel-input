import intlTelInput from "../intl-tel-input";
//* Keep the TS imports separate, as the above line gets substituted in the reactWithUtils build process.
import { Iti, SomeOptions } from "../intl-tel-input";
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from "react";

// make this available as a named export, so react users can access globals like intlTelInput.utils
export { intlTelInput };

type ItiProps = {
  initialValue?: string;
  onChangeNumber?: (number: string) => void;
  onChangeCountry?: (country: string) => void;
  onChangeValidity?: (valid: boolean) => void;
  onChangeErrorCode?: (errorCode: number | null) => void;
  usePreciseValidation?: boolean;
  initOptions?: SomeOptions;
  inputProps?: object;
};

const IntlTelInput = forwardRef(function IntlTelInput({
  initialValue = "",
  onChangeNumber = () => {},
  onChangeCountry = () => {},
  onChangeValidity = () => {},
  onChangeErrorCode = () => {},
  usePreciseValidation = false,
  initOptions = {},
  inputProps = {},
}: ItiProps, ref) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itiRef = useRef<Iti | null>(null);

  // expose the instance and input ref to the parent component
  useImperativeHandle(ref, () => ({
    getInstance: () => ({
      setCountry: (country: string) => itiRef.current?.setCountry(country),
      // override setNumber to also call update, to trigger onChangeNumber etc
      setNumber: (num: string) => {
        itiRef.current?.setNumber(num);
        update();
      },
    }),
    getInput: () => inputRef.current,
  }));
  
  const update = (): void => {
    const num = itiRef.current?.getNumber() || "";
    const countryIso = itiRef.current?.getSelectedCountryData().iso2 || "";
    // note: this number will be in standard E164 format, but any container component can use
    // intlTelInput.utils.formatNumber() to convert this to another format
    // as well as intlTelInput.utils.getNumberType() etc. if need be
    onChangeNumber(num);
    onChangeCountry(countryIso);

    if (itiRef.current) {
      const isValid = usePreciseValidation ? itiRef.current.isValidNumberPrecise() : itiRef.current.isValidNumber();
      if (isValid) {
        onChangeValidity(true);
        onChangeErrorCode(null);
      } else {
        const errorCode = itiRef.current.getValidationError();
        onChangeValidity(false);
        onChangeErrorCode(errorCode);
      }
    }
  };
  
  useEffect(() => {
    // store a reference to the current input ref, which otherwise is already lost in the cleanup function
    const inputRefCurrent = inputRef.current;
    if (inputRefCurrent) {
      itiRef.current = intlTelInput(inputRefCurrent, initOptions);
      inputRefCurrent.addEventListener("countrychange", update);
      // when plugin initialisation has finished (e.g. loaded utils script), update all the state values
      itiRef.current.promise.then(update);
    }
    return (): void => {
      if (inputRefCurrent) {
        inputRefCurrent.removeEventListener("countrychange", update);
      }
      itiRef.current?.destroy();
    };
  }, []);
  
  return (
    <input
      type="tel"
      ref={inputRef}
      onInput={update}
      defaultValue={initialValue}
      {...inputProps}
    />
  );
});

export default IntlTelInput;