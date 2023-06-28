# frozen_string_literal: true

module ::PolkasseemblyAuth
  class Engine < ::Rails::Engine
    engine_name discourse-polkaassembly-auth
    isolate_namespace PolkasseemblyAuth
    config.autoload_paths << File.join(config.root, "lib")
  end
end
