import { useToast } from "@chakra-ui/react";

import { truncate } from "@/lib/utils";

export const useErrorToast = () => {
  const _toast = useToast();
  const open = (e: unknown) => {
    let description = "";
    if (e instanceof Error) {
      description = e.message;
    } else if (typeof e === "string") {
      description = e;
    } else {
      description = "Unexpected error";
    }
    _toast({
      title: `Error`,
      description: truncate(description, 280),
      status: "error",
      position: "top-right",
      duration: 2500,
      isClosable: true,
    });
    console.error(description);
    return description;
  };
  return { open };
};
