import { atom } from "recoil";

const activeItem = atom({
  key: 'activeItem',
  default: 'string',
});

export default activeItem;