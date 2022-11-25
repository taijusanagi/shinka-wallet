import { Button, HStack, Image, SimpleGrid, Stack, Text, VStack } from "@chakra-ui/react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { NextPage } from "next";

import { Layout } from "@/components/Layout";
import { Unit } from "@/components/Unit";
import { useConnected } from "@/hooks/useConnected";
import { useShinkaWalletHandler } from "@/hooks/useShinkaWalletHandler";

import configJsonFile from "../../config.json";

const HomePage: NextPage = () => {
  const { connectedChainConfig } = useConnected();
  const {
    isShinkaWalletLoading,
    shinkaWalletBundler,
    shinkaWalletHandler,
    shinkaWalletAddress,
    shinkaWalletContract,

    isShinkaWalletConnected,
  } = useShinkaWalletHandler();

  const { openConnectModal } = useConnectModal();

  return (
    <Layout isLoading={isShinkaWalletLoading}>
      <Stack spacing="8">
        {!isShinkaWalletConnected && (
          <Stack spacing="6" py={"28"}>
            <VStack maxW="2xl" mx="auto" px={{ base: "4", md: "0" }} spacing="2">
              <Image src="/assets/hero.png" w="96" mx="auto" alt="logo" />
              <Text
                textAlign={"center"}
                fontSize={{ base: "md", md: "xl" }}
                fontWeight={"bold"}
                color={configJsonFile.style.color.accent}
              >
                {configJsonFile.description}
              </Text>
            </VStack>
            <VStack>
              <HStack spacing="2">
                <Button variant="secondary" onClick={() => window.open(configJsonFile.url.docs, "_blank")}>
                  Docs
                </Button>
                <Button onClick={openConnectModal}>Connect Wallet</Button>
              </HStack>
            </VStack>
          </Stack>
        )}
        {connectedChainConfig &&
          isShinkaWalletConnected &&
          shinkaWalletBundler &&
          shinkaWalletHandler &&
          shinkaWalletAddress &&
          shinkaWalletContract && (
            <SimpleGrid columns={{ base: 1, md: 1 }} spacing={4} py="6">
              <Unit header={"Account Abstraction ShortCut"} position="relative">
                <Stack spacing="4">
                  <Text fontSize="sm" fontWeight={"bold"} color={configJsonFile.style.color.black.text.secondary}>
                    dApps portal with bacth & automate tx
                  </Text>
                  <SimpleGrid columns={3} gap={4}>
                    <Image
                      src={"/assets/apps/hop.png"}
                      alt="nft"
                      rounded={configJsonFile.style.radius}
                      shadow={configJsonFile.style.shadow}
                      fit="cover"
                      width={"full"}
                      height={"full"}
                    />
                    <Image
                      src={"/assets/apps/uniswap.png"}
                      alt="nft"
                      rounded={configJsonFile.style.radius}
                      shadow={configJsonFile.style.shadow}
                      fit="cover"
                      width={"full"}
                      height={"full"}
                    />
                    <Image
                      src={"/assets/apps/opensea.png"}
                      alt="nft"
                      rounded={configJsonFile.style.radius}
                      shadow={configJsonFile.style.shadow}
                      fit="cover"
                      width={"full"}
                      height={"full"}
                    />
                  </SimpleGrid>
                </Stack>
              </Unit>
            </SimpleGrid>
          )}
      </Stack>
    </Layout>
  );
};

export default HomePage;
