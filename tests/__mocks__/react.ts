export const useMemo = (fn: any) => fn();
export const useCallback = (fn: any) => fn;
export const useEffect = (fn: any) => {
  fn();
};
export const useRef = (val: any) => ({ current: val });
export const useState = (init: any) => [typeof init === 'function' ? init() : init, () => {}];
export const createContext = () => ({});
export const useContext = () => null;
export default { useMemo, useCallback, useEffect, useRef, useState, createContext, useContext };
