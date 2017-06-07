FROM openjdk:8

WORKDIR /usr/src/headless-client

RUN git clone https://github.com/proffernetwork/token-headless-client .

RUN ./gradlew TokenHeadlessClientCapsule

CMD ["java", "-jar", "build/libs/token-headless-0.1.2-capsule.jar", "config.yml"]
