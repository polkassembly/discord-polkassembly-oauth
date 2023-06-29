# frozen_string_literal: true

module ::DiscoursePolkassemblyAuth
  PLUGIN_NAME ||= 'discourse-polkassembly-auth'
  class Engine < ::Rails::Engine
    engine_name PLUGIN_NAME
    isolate_namespace DiscoursePolkassemblyAuth
  end
end
