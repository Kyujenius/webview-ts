/** Extract only string keys from T, filtering out number | symbol. */
export type StrictKeyOf<T> = keyof T & string;
