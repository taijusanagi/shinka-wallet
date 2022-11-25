import {
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Icon,
  IconButton,
  Image,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Progress,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ConnectButton, useConnectModal } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/router";
import { AiOutlineMenu } from "react-icons/ai";
import { FaGithub } from "react-icons/fa";
import { MdArticle } from "react-icons/md";

import { Head } from "@/components/Head";
import { useAuth } from "@/hooks/useAuth";
import { useShinkaWallet } from "@/hooks/useShinkaWallet";

import configJsonFile from "../../../config.json";

export interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { auth } = useAuth();
  const { shinkaWallet } = useShinkaWallet();

  const { openConnectModal } = useConnectModal();

  const routes = [
    { path: "/", name: "Home" },
    { path: "/social-recovery", name: "Social Recovery" },
    { path: "/web3-shortcut-sample", name: "Web3 Shortcut Smaple" },
  ];

  return (
    <Flex minHeight={"100vh"} direction={"column"} bg={configJsonFile.style.color.black.bg}>
      <Head />
      {auth && !shinkaWallet && (
        <Box position={"absolute"} w="full">
          <Progress size="xs" isIndeterminate colorScheme={"brand"} />
        </Box>
      )}
      <Container as="section" maxW="8xl">
        <Box as="nav" py="4">
          <HStack justify="space-between" alignItems={"center"} h="12">
            <Link href="/">
              <Image src={"/assets/icon.png"} alt="logo" h="8" rounded={configJsonFile.style.radius} />
            </Link>
            <HStack spacing="3">
              <ConnectButton accountStatus={"address"} showBalance={false} chainStatus={"icon"} />
              {auth && (
                <Menu>
                  <MenuButton
                    rounded={configJsonFile.style.radius}
                    as={IconButton}
                    aria-label="Options"
                    icon={<AiOutlineMenu />}
                    variant="outline"
                  />
                  <MenuList>
                    {routes.map(({ path, name }) => {
                      return <MenuItem key={path}>{name}</MenuItem>;
                    })}
                  </MenuList>
                </Menu>
              )}
            </HStack>
          </HStack>
        </Box>
      </Container>
      {!shinkaWallet && (
        <Container maxW="lg">
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
                {!auth && <Button onClick={openConnectModal}>Connect Wallet</Button>}
              </HStack>
            </VStack>
          </Stack>
        </Container>
      )}
      <Container maxW="lg" flex={1}>
        {children}
      </Container>
      <Container maxW="8xl">
        <Box as="nav" py="4">
          <HStack justify={"space-between"}>
            <Text fontSize={"xs"} color={configJsonFile.style.color.white.text.secondary} fontWeight={"medium"}>
              <Text as="span" mr="2">
                😘
              </Text>
              Built in{" "}
              <Link href={configJsonFile.url.hackathon} target={"_blank"}>
                ETHVietnam
              </Link>
            </Text>
            <HStack spacing={"4"}>
              <Link href={configJsonFile.url.docs} target={"_blank"}>
                <Icon
                  as={MdArticle}
                  aria-label="article"
                  color={configJsonFile.style.color.white.text.secondary}
                  w={6}
                  h={6}
                />
              </Link>
              <Link href={configJsonFile.url.github} target={"_blank"}>
                <Icon
                  as={FaGithub}
                  aria-label="github"
                  color={configJsonFile.style.color.white.text.secondary}
                  w={6}
                  h={6}
                />
              </Link>
            </HStack>
          </HStack>
        </Box>
      </Container>
    </Flex>
  );
};
