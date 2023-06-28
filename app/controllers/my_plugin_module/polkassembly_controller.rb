# frozen_string_literal: true

module ::PolkasseemblyAuth
  class PolkasseemblyController < ::ApplicationController
    requires_plugin PolkasseemblyAuth

    def index
      render json: { hello: "world" }
    end
  end
end
