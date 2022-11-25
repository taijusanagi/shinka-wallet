import { useToast } from "@chakra-ui/react";

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
      description,
      status: "error",
      position: "top-right",
      duration: 5000,
      isClosable: true,
    });
    return description;
  };
  return { open };
};
