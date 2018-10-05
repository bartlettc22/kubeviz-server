FROM golang:1.10.2-alpine as builder

ARG VERSION=master
ARG GOOS=linux

WORKDIR /go/src/github.com/bartlettc22/kubeviz-server/
COPY main.go .
COPY vendor vendor
COPY cmd cmd
COPY server server
RUN ls
RUN CGO_ENABLED=0 GOOS=${GOOS} go build -ldflags "-X main.version=${VERSION}" -v -a -o kubeviz-server .

#### Stage 2 ####

FROM alpine:latest

RUN apk --no-cache add ca-certificates

COPY --from=builder /go/src/github.com/bartlettc22/kubeviz-server/kubeviz-server /usr/bin

ENTRYPOINT ["kubeviz-server"]
CMD ["start"]
