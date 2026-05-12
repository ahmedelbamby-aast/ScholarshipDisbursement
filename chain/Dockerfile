FROM node:20-alpine

RUN npm install -g ganache@7.9.2

EXPOSE 8545

CMD ["ganache", "--host", "0.0.0.0", "--port", "8545", "--chain.chainId", "31337", "--wallet.mnemonic", "test test test test test test test test test test test junk"]
