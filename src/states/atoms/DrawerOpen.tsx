import { atom } from "recoil";

const isDrawerOpen = atom({
  key: 'isDrawerOpen',
  default: false,
});

export default isDrawerOpen;