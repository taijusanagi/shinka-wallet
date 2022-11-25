import { useToast } from "@chakra-ui/react";

export const useErrorHandler = () => {
  const toast = useToast();
  const handleError = (e: unknown) => {
    let description = "";
    if (e instanceof Error) {
      description = e.message;
    } else if (typeof e === "string") {
      description = e;
    } else {
      description = "Unexpected error";
    }
    console.error(description);
    toast({
      title: `Error`,
      description,
      status: "error",
      position: "top-right",
      duration: 5000,
      isClosable: true,
    });
    return description;
  };
  return { handleError };
};
