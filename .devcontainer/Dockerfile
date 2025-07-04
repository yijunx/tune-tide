FROM node:18

ARG DOCKER_HOME="/opt/node-user"
ARG DOCKER_CODE="/opt/node-user/code"
ARG DOCKER_GROUP="node-user"
ARG DOCKER_USER="node-user"
ARG DOCKER_UID=5000

ENV ZSH="/opt/node-user/.oh-my-zsh"

WORKDIR ${DOCKER_CODE}

RUN groupadd -g ${DOCKER_UID} ${DOCKER_GROUP} && \
    useradd -r -u ${DOCKER_UID} -g ${DOCKER_GROUP} -d ${DOCKER_HOME} ${DOCKER_USER} && \
    chown -R ${DOCKER_USER}:${DOCKER_GROUP} ${DOCKER_HOME}

RUN apt-get update && \
    apt-get install -y tree && \
    apt-get install -y curl && \
    apt-get install -y sudo && \
    apt-get install -y zsh && \
    echo ${DOCKER_USER} ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/${DOCKER_USER} && \
    chmod 0440 /etc/sudoers.d/${DOCKER_USER}

RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

USER ${DOCKER_USER}

ENTRYPOINT [ "/bin/sh", "-c" ]