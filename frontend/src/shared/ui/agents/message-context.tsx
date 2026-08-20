// Vendored from the beui registry; import aliases remapped onto FSD shared.
import { createContext } from "react";

export type MessageSide = "start" | "end";

export const MessageSideContext = createContext<MessageSide | undefined>(
  undefined,
);
